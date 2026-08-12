import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Input, Button, Typography, message, Spin, DatePicker,
  Space, Row, Col, Table, Empty, Statistic,
} from 'antd';
import {
  PrinterOutlined, SearchOutlined, TableOutlined,
  ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, FileTextOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { diarioGeneralApi } from '../../api/diarioGeneralApi';
import type { DiarioGeneralItem } from '../../api/diarioGeneralApi';
import { formatDateParam } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const DiarioGeneral: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ——— Estados ——— */

  // Filtros
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [tipoDocumento, setTipoDocumento] = useState('');

  // Datos de tabla
  const [datos, setDatos] = useState<DiarioGeneralItem[]>([]);
  const [consultando, setConsultando] = useState(false);
  const [busquedaTabla, setBusquedaTabla] = useState('');

  // Generacion PDF
  const [generando, setGenerando] = useState(false);

  /* ——— UI setup ——— */

  useEffect(() => {
    setActiveModule('RDiarioGeneral');
    setPageTitleOverride('Diario General');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* ——— Handlers ——— */

  const handleConsultar = useCallback(async () => {
    setConsultando(true);
    setDatos([]);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechas[0].toDate()),
        fechaFinal: formatDateParam(fechas[1].toDate()),
        tipoDocumento: tipoDocumento || undefined,
      };

      const res = await diarioGeneralApi.obtenerDatos(sucursalActiva, filtros);
      const items = res.items ?? [];
      const sorted = [...items].sort((a, b) =>
        a.fechaDocumento.localeCompare(b.fechaDocumento)
      );
      setDatos(sorted);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al consultar los datos');
    } finally {
      setConsultando(false);
    }
  }, [sucursalActiva, fechas, tipoDocumento]);

  const handlePrint = useCallback(async () => {
    setGenerando(true);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechas[0].toDate()),
        fechaFinal: formatDateParam(fechas[1].toDate()),
        tipoDocumento: tipoDocumento || undefined,
      };

      const blob = datos.length > 0
        ? await diarioGeneralApi.imprimir(sucursalActiva, filtros, datos)
        : await diarioGeneralApi.generarPDF(sucursalActiva, filtros);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  }, [sucursalActiva, fechas, tipoDocumento, datos]);

  /* ——— KPIs y filtro de tabla ——— */

  const kpi = useMemo(() => {
    if (datos.length === 0) return null;
    const items = datos.map((r) => ({
      ...r,
      tipoAsiento: r.tipoAsiento.trim(),
    }));
    const totalDebe = items.filter((r) => r.tipoAsiento === 'Debito').reduce((s, r) => s + r.montoAlterno, 0);
    const totalHaber = items.filter((r) => r.tipoAsiento === 'Credito').reduce((s, r) => s + r.montoAlterno, 0);
    const transaccionesUnicas = new Set(items.map((r) => r.transaccionID)).size;
    return { totalDebe, totalHaber, cantidadTransacciones: transaccionesUnicas, cantidadAsientos: items.length };
  }, [datos]);

  const datosFiltrados = useMemo(() => {
    if (!busquedaTabla) return datos;
    const term = busquedaTabla.toLowerCase();
    return datos.filter(
      (r) =>
        `${r.documentoCodigo}-${r.documentoNoDocumento}`.toLowerCase().includes(term) ||
        r.documentoCodigo.toLowerCase().includes(term) ||
        r.documentoNoDocumento.toLowerCase().includes(term) ||
        r.conceptoNombre.toLowerCase().includes(term) ||
        r.cuentaContableNoCuenta.toLowerCase().includes(term) ||
        r.cuentaContableNombre.toLowerCase().includes(term) ||
        r.tipoAsiento.trim().toLowerCase().includes(term),
    );
  }, [datos, busquedaTabla]);

  const handleExportExcel = useCallback(async () => {
    const companyName = await getCompanyName(sucursalActiva);

    const desdeStr = dayjs(fechas[0]).format('DD/MM/YYYY');
    const hastaStr = dayjs(fechas[1]).format('DD/MM/YYYY');
    const filtroDoc = tipoDocumento || 'Todos';

    const columnHeaders = ['Fecha', 'Documento', 'Concepto', 'No. Cuenta', 'Nombre Cuenta', 'Débito', 'Crédito'];
    const dataRows = datosFiltrados.map((r) => [
      dayjs(r.fechaDocumento).format('DD/MM/YYYY'),
      `${r.documentoCodigo}-${r.documentoNoDocumento}`,
      toTitleCase(r.conceptoNombre),
      r.cuentaContableNoCuenta,
      toTitleCase(r.cuentaContableNombre),
      r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno : 0,
      r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno : 0,
    ]);

    exportToExcel({
      companyName,
      extraHeaderRows: [
        ['REPORTE DIARIO GENERAL'],
        [`Período: ${desdeStr} - ${hastaStr}  |  Doc: ${filtroDoc}`],
        [],
      ],
      columnHeaders,
      dataRows,
      sheetName: 'DiarioGeneral',
      columnWidths: [{ wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }],
    });
  }, [sucursalActiva, datosFiltrados, fechas, tipoDocumento]);

  /* ——— Render ——— */

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

      {/* ——— Filtros ——— */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Rango de Fechas</Text>
              </div>
              <RangePicker
                value={fechas}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) setFechas([dates[0], dates[1]]);
                }}
                format="YYYY-MM-DD"
                allowClear={false}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} md={8}>
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

      {/* ——— Tabla de datos ——— */}
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
              <Col xs={12} sm={6} md={6}>
                <Statistic
                  title="Total Débitos"
                  value={kpi.totalDebe}
                  precision={2}
                  prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
                  valueStyle={{ color: '#f5222d', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6} md={6}>
                <Statistic
                  title="Total Créditos"
                  value={kpi.totalHaber}
                  precision={2}
                  prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={6} md={6}>
                <Statistic
                  title="Cantidad Transacciones"
                  value={kpi.cantidadTransacciones}
                  prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
                  valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
                />
              </Col>
              <Col xs={12} sm={6} md={6}>
                <Statistic
                  title="Cantidad Asientos"
                  value={kpi.cantidadAsientos}
                  prefix={<FileTextOutlined style={{ color: '#556ee6' }} />}
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
                placeholder="Buscar por documento, concepto o cuenta..."
                allowClear
                onSearch={(v) => setBusquedaTabla(v)}
                onChange={(e) => !e.target.value && setBusquedaTabla('')}
                style={{ width: 400 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <PermissionGate accion="EXPORTAR">
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} />
              </PermissionGate>
            </div>

            <Table
              className="paces-list-table"
              dataSource={datosFiltrados}
              rowKey={(r) => `${r.fechaDocumento}-${r.transaccionID}-${r.cuentaContableNoCuenta}-${r.tipoAsiento}-${r.monto}`}
              size="small"
              pagination={{ pageSize: 50, showTotal: (t) => `${t} registros` }}
              scroll={{ x: 1200 }}
              columns={[
                { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                { title: 'Documento', key: 'documento', width: 140, render: (_: any, r: DiarioGeneralItem) => `${r.documentoCodigo}-${r.documentoNoDocumento}` },
                { title: 'Concepto', key: 'concepto', width: 200, render: (_: any, r: DiarioGeneralItem) => toTitleCase(r.conceptoNombre) },
                { title: 'No. Cuenta', dataIndex: 'cuentaContableNoCuenta', key: 'cuentaContableNoCuenta', width: 120 },
                { title: 'Nombre Cuenta', key: 'cuentaContableNombre', width: 200, render: (_: any, r: DiarioGeneralItem) => toTitleCase(r.cuentaContableNombre) },
                { title: 'Débito', key: 'montoDebito', width: 130, align: 'right', render: (_: any, r: DiarioGeneralItem) => r.tipoAsiento.trim() === 'Debito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
                { title: 'Crédito', key: 'montoCredito', width: 130, align: 'right', render: (_: any, r: DiarioGeneralItem) => r.tipoAsiento.trim() === 'Credito' ? r.montoAlterno.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-' },
              ]}
              locale={{ emptyText: <Empty description="Sin resultados" /> }}
            />
          </Card>
        </>
      )}

      {!consultando && datos.length === 0 && (
        <Card className="paces-card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Empty description="Seleccione un rango de fechas y presione Consultar para ver el reporte" />
          </div>
        </Card>
      )}
    </>
  );
};

export default DiarioGeneral;
