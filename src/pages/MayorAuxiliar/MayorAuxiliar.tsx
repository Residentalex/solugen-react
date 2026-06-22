import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Card, Input, Button, Typography, message, Spin, DatePicker, Checkbox,
  Modal, Space, Row, Col, Table, Empty, Statistic,
} from 'antd';
import { PrinterOutlined, SearchOutlined, CloseOutlined, TableOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { mayorAuxiliarApi } from '../../api/mayorAuxiliarApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { companiaApi } from '../../api/companiaApi';
import { formatDateParam } from '../../utils/formats';
import type { CuentaContableDTO } from '../../types/contabilidad';

const { Text } = Typography;

interface MayorAuxiliarItem {
  fechaDocumento: string;
  documentoCodigo: string;
  documentoNoDocumento: string;
  documentoNombre: string;
  cuentaContableNoCuenta: string;
  cuentaContableNombre: string;
  tipoAsiento: string;
  monto: number;
  montoAlterno: number;
  balance: number;
  ordenDocumento: number;
  balanceDocumento: number;
  origenCuenta: string;
}

const MayorAuxiliar: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* â”€â”€â”€â”€â”€ Estados â”€â”€â”€â”€â”€ */

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<dayjs.Dayjs>(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState<dayjs.Dayjs>(dayjs());
  const [noCuenta, setNoCuenta] = useState('');
  const [nomCuenta, setNomCuenta] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [balanceAnterior, setBalanceAnterior] = useState(true);
  const [detallado, setDetallado] = useState(true);

  // Datos de tabla
  const [datos, setDatos] = useState<MayorAuxiliarItem[]>([]);
  const [balances, setBalances] = useState<{ balanceInicial: number; balanceInicialAlterno: number; balanceFinal: number; balanceFinalAlterno: number } | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [busquedaTabla, setBusquedaTabla] = useState('');

  // Generacion PDF
  const [generando, setGenerando] = useState(false);

  // Modal de busqueda de cuenta contable
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaContableDTO[]>([]);
  const [cuentasOrig, setCuentasOrig] = useState<CuentaContableDTO[]>([]);
  const [buscandoCuenta, setBuscandoCuenta] = useState(false);
  const [_searchCuenta, setSearchCuenta] = useState('');
  const cuentaSearchRef = useRef<any>(null);

  useEffect(() => {
    if (modalCuentaAbierto) {
      const timer = setTimeout(() => {
        cuentaSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalCuentaAbierto]);

  /* â”€â”€â”€â”€â”€ UI setup â”€â”€â”€â”€â”€ */

  useEffect(() => {
    setActiveModule('RMayorAux');
    setPageTitleOverride('Mayor Auxiliar');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* â”€â”€â”€â”€â”€ Handlers â”€â”€â”€â”€â”€ */

  const handlePrint = useCallback(async () => {
    setGenerando(true);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechaDesde.toDate()),
        fechaFinal: formatDateParam(fechaHasta.toDate()),
        noCuenta: noCuenta || undefined,
        tipoDocumento: tipoDocumento || undefined,
        balanceAnterior,
        detallado,
      };

      const blob = datos.length > 0 && balances
        ? await mayorAuxiliarApi.imprimir(sucursalActiva, filtros, datos, balances)
        : await mayorAuxiliarApi.generarPDF(sucursalActiva, filtros);
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 30000);
      }, 2000);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  }, [sucursalActiva, fechaDesde, fechaHasta, noCuenta, tipoDocumento, balanceAnterior, detallado, datos, balances]);

  const handleConsultar = useCallback(async () => {
    setConsultando(true);
    setDatos([]);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechaDesde.toDate()),
        fechaFinal: formatDateParam(fechaHasta.toDate()),
        noCuenta: noCuenta || undefined,
        tipoDocumento: tipoDocumento || undefined,
        balanceAnterior,
        detallado,
      };

      const res = await mayorAuxiliarApi.obtenerDatos(sucursalActiva, filtros);
      // Compatible con formato nuevo { items, balanceInicial } y antiguo (array plano)
      const items = Array.isArray(res) ? res : (res.items ?? []);
      const sorted = [...items].sort((a, b) =>
        a.fechaDocumento.localeCompare(b.fechaDocumento)
      );
      setDatos(sorted);
      setBalances({
        balanceInicial: Array.isArray(res) ? 0 : (res.balanceInicial ?? 0),
        balanceInicialAlterno: Array.isArray(res) ? 0 : (res.balanceInicialAlterno ?? 0),
        balanceFinal: Array.isArray(res) ? 0 : (res.balanceFinal ?? 0),
        balanceFinalAlterno: Array.isArray(res) ? 0 : (res.balanceFinalAlterno ?? 0),
      });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al consultar los datos');
    } finally {
      setConsultando(false);
    }
  }, [sucursalActiva, fechaDesde, fechaHasta, noCuenta, tipoDocumento, balanceAnterior, detallado]);

  /* â”€â”€â”€â”€â”€ KPIs y filtro de tabla â”€â”€â”€â”€â”€ */

  const kpi = useMemo(() => {
    if (datos.length === 0 || !balances) return null;
    const items = datos.map((r) => ({
      ...r,
      tipoAsiento: r.tipoAsiento.trim(),
      origenCuenta: r.origenCuenta.trim(),
    }));
    const totalDebe = items.filter((r) => r.tipoAsiento === 'Debito').reduce((s, r) => s + r.montoAlterno, 0);
    const totalHaber = items.filter((r) => r.tipoAsiento === 'Credito').reduce((s, r) => s + r.montoAlterno, 0);
    return { totalDebe, totalHaber, balanceInicial: balances.balanceInicial, balanceFinal: balances.balanceFinal };
  }, [datos, balances]);

  const datosFiltrados = useMemo(() => {
    if (!busquedaTabla) return datos;
    const term = busquedaTabla.toLowerCase();
    return datos.filter(
      (r) =>
        r.documentoCodigo.toLowerCase().includes(term) ||
        r.documentoNoDocumento.toLowerCase().includes(term) ||
        r.cuentaContableNoCuenta.toLowerCase().includes(term) ||
        r.cuentaContableNombre.toLowerCase().includes(term) ||
        r.tipoAsiento.trim().toLowerCase().includes(term),
    );
  }, [datos, busquedaTabla]);

  const gruposDocumento = useMemo(() => {
    if (datosFiltrados.length === 0) return [];
    const grupos: { key: string; codigo: string; nombre: string; minFecha: string; maxFecha: string; totalDebe: number; totalHaber: number; items: MayorAuxiliarItem[] }[] = [];
    const map = new Map<string, MayorAuxiliarItem[]>();
    for (const item of datosFiltrados) {
      if (!map.has(item.documentoCodigo)) map.set(item.documentoCodigo, []);
      map.get(item.documentoCodigo)!.push(item);
    }
    for (const [codigo, items] of map) {
      grupos.push({
        key: codigo,
        codigo,
        nombre: items[0].documentoNombre,
        minFecha: items[0].fechaDocumento,
        maxFecha: items[items.length - 1].fechaDocumento,
        totalDebe: items.filter((i) => i.tipoAsiento.trim() === 'Debito').reduce((s, i) => s + i.montoAlterno, 0),
        totalHaber: items.filter((i) => i.tipoAsiento.trim() === 'Credito').reduce((s, i) => s + i.montoAlterno, 0),
        items,
      });
    }
    return grupos.sort((a, b) => a.minFecha.localeCompare(b.minFecha));
  }, [datosFiltrados]);

  const handleExportExcel = useCallback(async () => {
    let c = { nombre: 'SOLUGEN S.R.L.', direccion: '', telefono: '', rnc: '' };
    try {
      const lista = await companiaApi.obtenerTodas(sucursalActiva);
      if (lista.length > 0) {
        c.nombre = lista[0].nombre ?? c.nombre;
        c.direccion = lista[0].direccion ?? '';
        c.telefono = lista[0].telefono ?? '';
        c.rnc = lista[0].rnc ?? '';
      }
    } catch { /* ignora */ }

    const desdeStr = dayjs(fechaDesde).format('DD/MM/YYYY');
    const hastaStr = dayjs(fechaHasta).format('DD/MM/YYYY');
    const filtroCta = nomCuenta || 'Todas';
    const filtroDoc = tipoDocumento || 'Todos';

    // Header rows (array of arrays)
    const aoa: any[][] = [
      [c.nombre],
      [c.direccion],
      [`Tel.: ${c.telefono}`],
      [`RNC: ${c.rnc}`],
      ['REPORTE MAYOR AUXILIAR'],
      [`Periodo: ${desdeStr} - ${hastaStr}  |  Cuenta: ${filtroCta}  |  Doc: ${filtroDoc}`],
      [],
    ];

    if (detallado) {
      aoa.push(['Fecha', 'Documento', 'No. Cuenta', 'Nombre Cuenta', 'Tipo', 'Debito', 'Credito', 'Balance']);
      for (const r of datosFiltrados) {
        aoa.push([
          dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
          `${r.documentoCodigo}-${r.documentoNoDocumento}`,
          r.cuentaContableNoCuenta,
          r.cuentaContableNombre,
          r.tipoAsiento.trim(),
          r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
          r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
          r.balance,
        ]);
      }
    } else {
      aoa.push(['Codigo', 'Nombre', 'Desde', 'Hasta', 'Total Debito', 'Total Credito']);
      for (const g of gruposDocumento) {
        aoa.push([g.codigo, g.nombre, dayjs(g.minFecha).format('DD/MM/YYYY'), dayjs(g.maxFecha).format('DD/MM/YYYY'), g.totalDebe, g.totalHaber]);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = detallado
      ? [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
      : [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];

    // Merge header cells: rows 0-5 span all columns
    const ncols = detallado ? 8 : 6;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: ncols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: ncols - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: ncols - 1 } },
    ];

    // Bold company name (row 0)
    if (ws['!rows'] === undefined) ws['!rows'] = [];
    ws['!rows'][0] = { hpx: 20 };

    // Apply bold via cell styles (XLSX supports rich text via s)
    for (let c = 0; c < ncols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true, sz: 14 } };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'MayorAuxiliar');
    XLSX.writeFile(wb, `MayorAuxiliar_${dayjs().format('YYYYMMDD')}.xlsx`);
  }, [sucursalActiva, datosFiltrados, gruposDocumento, detallado, kpi, fechaDesde, fechaHasta, nomCuenta, tipoDocumento]);

  /* â”€â”€â”€â”€â”€ Handlers de busqueda de cuenta â”€â”€â”€â”€â”€ */

  const abrirModalCuenta = async () => {
    setModalCuentaAbierto(true);
    setSearchCuenta('');
    setBuscandoCuenta(true);
    try {
      const lista = await cuentaContableApi.obtenerAuxiliares(sucursalActiva);
      setCuentas(lista || []);
      setCuentasOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables');
    } finally {
      setBuscandoCuenta(false);
    }
  };

  const buscarCuenta = (valor: string) => {
    setSearchCuenta(valor);
    if (!valor) {
      setCuentas([...cuentasOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = cuentasOrig.filter(
      (c) =>
        c.noCuenta?.toLowerCase().includes(term) ||
        c.nombre?.toLowerCase().includes(term),
    );
    setCuentas(filtradas);
  };

  const seleccionarCuenta = (item: CuentaContableDTO) => {
    setNoCuenta(item.noCuenta);
    setNomCuenta(`${item.noCuenta} - ${item.nombre}`);
    setModalCuentaAbierto(false);
  };

  const limpiarCuenta = () => {
    setNoCuenta('');
    setNomCuenta('');
  };

  /* â”€â”€â”€â”€â”€ Render â”€â”€â”€â”€â”€ */

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* â”€â”€â”€â”€â”€ Filtros â”€â”€â”€â”€â”€ */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha Desde</Text>
              </div>
              <DatePicker
                value={fechaDesde}
                onChange={(d) => d && setFechaDesde(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha Hasta</Text>
              </div>
              <DatePicker
                value={fechaHasta}
                onChange={(d) => d && setFechaHasta(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Cuenta</Text>
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Buscar cuenta..."
                  value={nomCuenta}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={abrirModalCuenta} />
                {nomCuenta ? (
                  <Button icon={<CloseOutlined />} onClick={limpiarCuenta} />
                ) : null}
              </Space.Compact>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tipo Documento</Text>
              </div>
              <Input
                placeholder="Ej: FAC, NCR, NDB..."
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={balanceAnterior} onChange={(e) => setBalanceAnterior(e.target.checked)}>
                Incluir Balance Anterior
              </Checkbox>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={detallado} onChange={(e) => setDetallado(e.target.checked)}>
                Vista Detallada
              </Checkbox>
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<TableOutlined />}
                  onClick={handleConsultar}
                  loading={consultando}
                >
                  Consultar
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  loading={generando}
                >
                  Generar PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* â”€â”€â”€â”€â”€ Tabla de datos â”€â”€â”€â”€â”€ */}
      {consultando && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Consultando datos..." />
        </div>
      )}

      {!consultando && datos.length > 0 && kpi && (
        <>
          {/* KPIs */}
          <Card className="paces-card" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Balance Inicial"
                  value={kpi.balanceInicial}
                  precision={2}
                  prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
                  valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total DÃ©bitos"
                  value={kpi.totalDebe}
                  precision={2}
                  prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
                  valueStyle={{ color: '#f5222d', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total CrÃ©ditos"
                  value={kpi.totalHaber}
                  precision={2}
                  prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Balance Final"
                  value={kpi.balanceFinal}
                  precision={2}
                  prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
                  valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
                />
              </Col>
            </Row>
          </Card>

          {/* Tabla */}
          <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Input.Search
                placeholder="Buscar por documento, cuenta o nombre..."
                allowClear
                onSearch={(v) => setBusquedaTabla(v)}
                onChange={(e) => !e.target.value && setBusquedaTabla('')}
                style={{ width: 400 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                Exportar Excel
              </Button>
            </div>

            {detallado ? (
              <Table
                className="paces-list-table"
                dataSource={datosFiltrados}
                rowKey={(r) => `${r.fechaDocumento}-${r.documentoCodigo}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`}
                size="small"
                pagination={{ pageSize: 50, showTotal: (t) => `${t} registros` }}
                scroll={{ x: 1400 }}
                columns={[
                  { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                  { title: 'Documento', key: 'documento', width: 140, render: (_: any, r: MayorAuxiliarItem) => `${r.documentoCodigo}-${r.documentoNoDocumento}` },
                  { title: 'No. Cuenta', dataIndex: 'cuentaContableNoCuenta', key: 'cuentaContableNoCuenta', width: 120 },
                  { title: 'Nombre Cuenta', dataIndex: 'cuentaContableNombre', key: 'cuentaContableNombre', width: 200 },
                  { title: 'Tipo', dataIndex: 'tipoAsiento', key: 'tipoAsiento', width: 80 },
                  { title: 'Monto DÃ©bito', key: 'montoDebito', width: 130, align: 'right', render: (_: any, r: MayorAuxiliarItem) => r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
                  { title: 'Monto CrÃ©dito', key: 'montoCredito', width: 130, align: 'right', render: (_: any, r: MayorAuxiliarItem) => r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
                  { title: 'Balance', dataIndex: 'balance', key: 'balance', width: 130, align: 'right', render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                ]}
                locale={{ emptyText: <Empty description="Sin resultados" /> }}
              />
            ) : (
              <Table
                className="paces-list-table"
                dataSource={gruposDocumento}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 25, showTotal: (t) => `${t} documentos` }}
                scroll={{ x: 1000 }}
                columns={[
                  { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 80 },
                  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 200 },
                  { title: 'Desde', dataIndex: 'minFecha', key: 'minFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                  { title: 'Hasta', dataIndex: 'maxFecha', key: 'maxFecha', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                  { title: 'Total DÃ©bito', dataIndex: 'totalDebe', key: 'totalDebe', width: 130, align: 'right', render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                  { title: 'Total CrÃ©dito', dataIndex: 'totalHaber', key: 'totalHaber', width: 130, align: 'right', render: (v: number) => v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                ]}
                locale={{ emptyText: <Empty description="Sin resultados" /> }}
              />
            )}
          </Card>
        </>
      )}

      {/* â”€â”€â”€â”€â”€ Modal busqueda cuenta contable â”€â”€â”€â”€â”€ */}
      <Modal
        title="Buscar Cuenta Contable"
        open={modalCuentaAbierto}
        onCancel={() => setModalCuentaAbierto(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Input.Search
          ref={cuentaSearchRef}
          placeholder="Buscar por nÃºmero o nombre..."
          allowClear
          onSearch={buscarCuenta}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'No. Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 140 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={cuentas}
          rowKey="noCuenta"
          loading={buscandoCuenta}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: CuentaContableDTO) => ({
            onClick: () => seleccionarCuenta(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>
    </>
  );
};

export default MayorAuxiliar;
