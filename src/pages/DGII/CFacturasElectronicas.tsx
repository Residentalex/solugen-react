import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Radio,
  Table,
  Button,
  Select,
  Input,
  message,
  Modal,
  Spin,
  Empty,
  theme,
} from 'antd';
import {
  FileDoneOutlined,
  FileSyncOutlined,
  DollarOutlined,
  ShopOutlined,
  QrcodeOutlined,
  SendOutlined,
  SwapOutlined,
  CheckOutlined,
  FileExcelOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import FechaColumnCell from '../../components/FechaColumnCell';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { dgiiApi } from '../../api/dgiiApi';
import type { ResumenTipoNcfDTO, ResumenTipoNcfSucursalDTO, EnvioDGIIDTO } from '../../types/facturacion';

const { RangePicker } = DatePicker;

const SUCURSAL_NOMBRE: Record<number, string> = {
  0: 'Orense Plaza',
  1: 'Hiper Romana',
  2: 'Orense Villa Hermosa',
  3: 'El Ofertazo',
  4: 'Consolidado',
  5: 'Compra',
};

const SUCURSAL_COLOR: Record<string, string> = {
  'Orense Plaza': '#556ee6',
  'Hiper Romana': '#34c38f',
  'Orense Villa Hermosa': '#f46a6a',
  'El Ofertazo': '#f0b345',
  'Consolidado': '#6f42c1',
  'Compra': '#00c4cc',
};

function toTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CFacturasElectronicas: React.FC = () => {
  const { token } = theme.useToken();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [fechaRango, setFechaRango] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [vista, setVista] = useState<'emitidos' | 'pendientes'>('emitidos');
  const [cargando, setCargando] = useState(false);
  const [cargandoTabla, setCargandoTabla] = useState(false);
  const [resumen, setResumen] = useState<ResumenTipoNcfDTO[]>([]);
  const [resumenSucursal, setResumenSucursal] = useState<ResumenTipoNcfSucursalDTO[]>([]);
  const [emitidos, setEmitidos] = useState<EnvioDGIIDTO[]>([]);
  const [pendientes, setPendientes] = useState<EnvioDGIIDTO[]>([]);
  const [pagina, setPagina] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(25);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Bloqueo global de acciones masivas: Enviar, Reasignar y Marcar nunca coexisten
  const [procesando, setProcesando] = useState(false);
  // Ref sincronica: el state es asincrono y un doble clic rapido lo elude
  const procesandoRef = useRef(false);

  const iniciarProcesamiento = useCallback((): boolean => {
    if (procesandoRef.current) return false;
    procesandoRef.current = true;
    setProcesando(true);
    return true;
  }, []);

  const finalizarProcesamiento = useCallback(() => {
    procesandoRef.current = false;
    setProcesando(false);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPagina(1);
  }, []);

  const cargarDashboard = useCallback(async () => {
    const desde = fechaRango[0];
    const hasta = fechaRango[1];
    setCargando(true);
    try {
      const [res, resSuc] = await Promise.all([
        dgiiApi.obtenerResumen(desde, hasta),
        dgiiApi.obtenerResumenPorSucursal(desde, hasta),
      ]);
      setResumen(res || []);
      setResumenSucursal(resSuc || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos DGII');
    } finally {
      setCargando(false);
    }
  }, [fechaRango]);

  const cargarTabla = useCallback(async (page = 1, pageSize = 25) => {
    const desde = fechaRango[0];
    const hasta = fechaRango[1];
    const skip = (page - 1) * pageSize;
    setCargandoTabla(true);
    try {
      const [emi, pen] = await Promise.all([
        dgiiApi.obtenerEmitidos(desde, hasta, skip, pageSize),
        dgiiApi.obtenerPendientes(desde, hasta, skip, pageSize),
      ]);
      setEmitidos(emi || []);
      setPendientes(pen || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos DGII');
    } finally {
      setCargandoTabla(false);
    }
  }, [fechaRango]);

  useEffect(() => {
    setActiveModule('CFacturasElectronicas');
    updateToolbar({});
    cargarDashboard();
    cargarTabla(1, tamanoPagina);
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDashboard, cargarTabla, tamanoPagina]);

  const TIPO_DEV = 20;
  const TIPO_FAC = 35;
  const METODO_ELECTRONICA = 1;

  function getSelectedItems(ids: React.Key[]): EnvioDGIIDTO[] {
    const set = new Set(ids.map(String));
    return pendientes.filter((p) => set.has(`${p.sucursal}-${p.transaccionID}`));
  }

  function determinarTipoNCF(item: EnvioDGIIDTO, metodoFacturacion: number): string {
    let tipoNCF = item.ncf && item.ncf.length >= 3 ? item.ncf.substring(0, 3) : '';
    if (item.tipoDocumento === TIPO_DEV) tipoNCF = 'E34';
    if (!tipoNCF) tipoNCF = item.tipoDocumento === TIPO_FAC ? 'E31' : 'E32';
    if (!tipoNCF) tipoNCF = item.tipoComprobante || '';

    if (metodoFacturacion === METODO_ELECTRONICA) {
      switch (tipoNCF) {
        case 'B01': tipoNCF = 'E31'; break;
        case 'B02': tipoNCF = 'E32'; break;
        case 'B14': tipoNCF = 'E44'; break;
        case 'B15': tipoNCF = 'E45'; break;
      }
    }
    return tipoNCF;
  }

  const handleEnviar = useCallback(async (ids: React.Key[]) => {
    const items = getSelectedItems(ids);
    if (items.length === 0) return;
    if (!iniciarProcesamiento()) return;

    Modal.confirm({
      title: 'Reenviar a DGII',
      content: `¿Está seguro que desea reenviar ${items.length} comprobante(s)?`,
      okText: 'Sí, enviar',
      cancelText: 'Cancelar',
      onCancel: finalizarProcesamiento,
      onOk: async () => {
        const errores: string[] = [];
        const key = 'envio';
        message.loading({ content: `Enviando 0 / ${items.length}...`, key, duration: 0 });

        const maxParalelo = 5;
        let completados = 0;

        function inferirTipoDocumento(item: EnvioDGIIDTO): number {
          if (item.tipoDocumento !== undefined) return item.tipoDocumento;
          const prefix = item.ncf && item.ncf.length >= 3 ? item.ncf.substring(0, 3) : '';
          return prefix === 'E34' ? 20 : 35; // E34→DEV, otros(E31/E32/PV)→FAC
        }

        const nextTask = async (item: EnvioDGIIDTO) => {
          try {
            await dgiiApi.cargarYEnviarFactura(item.sucursal, item.transaccionID, inferirTipoDocumento(item));
          } catch (err: any) {
            errores.push(`ID ${item.transaccionID}: ${err?.message || err}`);
          }
          completados++;
          message.loading({ content: `Enviando ${completados} / ${items.length}...`, key, duration: 0 });
        };

        try {
          const slice = (arr: EnvioDGIIDTO[], size: number) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
              arr.slice(i * size, i * size + size)
            );
          const batches = slice(items, maxParalelo);
          for (const batch of batches) {
            await Promise.all(batch.map(nextTask));
          }
        } finally {
          if (errores.length > 0) {
            const msj = `Se produjeron ${errores.length} errores:\n${errores.slice(0, 10).join('\n')}${errores.length > 10 ? '\n... (más errores)' : ''}`;
            message.error({ content: msj, key, duration: 6 });
          } else {
            message.success({ content: `${items.length} comprobante(s) enviado(s) correctamente`, key, duration: 3 });
          }
          setSelectedRowKeys([]);
          cargarTabla(1, tamanoPagina);
          finalizarProcesamiento();
        }
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina, iniciarProcesamiento, finalizarProcesamiento]);

  const handleReasignar = useCallback(async (ids: React.Key[]) => {
    const items = getSelectedItems(ids);
    if (items.length === 0) return;
    if (!iniciarProcesamiento()) return;

    Modal.confirm({
      title: 'Reasignar NCF',
      content: `¿Está seguro que desea reasignar NCF a ${items.length} comprobante(s)?`,
      okText: 'Sí, reasignar',
      cancelText: 'Cancelar',
      onCancel: finalizarProcesamiento,
      onOk: async () => {
        try {
          const errores: string[] = [];
          const key = 'reasignar';
          const metodoCache = new Map<number, number>();

          message.loading({ content: `Reasignando 0 / ${items.length}...`, key, duration: 0 });
          let completados = 0;

          for (const item of items) {
            try {
              if (!metodoCache.has(item.sucursal)) {
                const metodo = await dgiiApi.obtenerMetodoFacturacion(item.sucursal);
                metodoCache.set(item.sucursal, metodo);
              }
              const tipoNCF = determinarTipoNCF(item, metodoCache.get(item.sucursal)!);
              await dgiiApi.reasignarNCF(item.sucursal, tipoNCF, item.transaccionID);
              completados++;
              message.loading({ content: `Reasignando ${completados} / ${items.length}...`, key, duration: 0 });
            } catch (err: any) {
              errores.push(`ID ${item.transaccionID}: ${err?.message || err}`);
            }
          }

          if (errores.length > 0) {
            const msj = `Se produjeron ${errores.length} errores:\n${errores.slice(0, 10).join('\n')}${errores.length > 10 ? '\n... (más errores)' : ''}`;
            message.error({ content: msj, key, duration: 6 });
          } else {
            message.success({ content: `${items.length} NCF reasignado(s) correctamente`, key, duration: 3 });
          }
          setSelectedRowKeys([]);
          cargarTabla(1, tamanoPagina);
        } finally {
          finalizarProcesamiento();
        }
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina, iniciarProcesamiento, finalizarProcesamiento]);

  const handleMarcarEnviado = useCallback(async (ids: React.Key[]) => {
    const items = getSelectedItems(ids);
    if (items.length === 0) return;
    if (!iniciarProcesamiento()) return;

    Modal.confirm({
      title: 'Marcar como Enviado',
      content: `¿Está seguro que desea marcar como enviado ${items.length} comprobante(s)?`,
      okText: 'Sí, marcar',
      cancelText: 'Cancelar',
      onCancel: finalizarProcesamiento,
      onOk: async () => {
        try {
          const errores: string[] = [];
          const key = 'marcar';
          message.loading({ content: `Marcando 0 / ${items.length}...`, key, duration: 0 });
          let completados = 0;

          for (const item of items) {
            try {
              await dgiiApi.marcarEnviado(item.sucursal, item.transaccionID);
              completados++;
              message.loading({ content: `Marcando ${completados} / ${items.length}...`, key, duration: 0 });
            } catch (err: any) {
              errores.push(`ID ${item.transaccionID}: ${err?.message || err}`);
            }
          }

          if (errores.length > 0) {
            const msj = `Se produjeron ${errores.length} errores:\n${errores.slice(0, 10).join('\n')}${errores.length > 10 ? '\n... (más errores)' : ''}`;
            message.error({ content: msj, key, duration: 6 });
          } else {
            message.success({ content: `${items.length} comprobante(s) marcado(s) como enviado(s)`, key, duration: 3 });
          }
          setSelectedRowKeys([]);
          cargarTabla(1, tamanoPagina);
        } finally {
          finalizarProcesamiento();
        }
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina, iniciarProcesamiento, finalizarProcesamiento]);

  const handleExportarExcel = async () => {
    const sucursalActiva = useAuthStore.getState().sucursalActiva;
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = dataTabla || [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `FacturasElectronicas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'FacturasElectronicas',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const totalEmitidos = useMemo(
    () => resumen.reduce((sum, r) => sum + (r.cantidad || 0), 0),
    [resumen]
  );
  const totalPendientes = pendientes.length;
  const montoTotal = useMemo(
    () => resumen.reduce((sum, r) => sum + (r.totalMonto || 0), 0),
    [resumen]
  );
  const sucursalesActivas = useMemo(
    () => new Set(resumenSucursal.map((r) => r.sucursal)).size,
    [resumenSucursal]
  );

  const sucursalAgrupada = useMemo(() => {
    const map = new Map<number, number>();
    resumenSucursal.forEach((r) => {
      map.set(r.sucursal, (map.get(r.sucursal) || 0) + r.cantidad);
    });
    return Array.from(map.entries())
      .map(([suc, cantidad]) => ({
        sucursal: SUCURSAL_NOMBRE[suc] || `Suc ${suc}`,
        cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [resumenSucursal]);

  const barSucursalConfig = useMemo(() => ({
    data: sucursalAgrupada,
    xField: 'sucursal',
    yField: 'cantidad',
    seriesField: 'sucursal',
    height: 300,
    barWidthRatio: 0.75,
    color: ({ sucursal }: any) => SUCURSAL_COLOR[sucursal] || '#999',
    legend: {
      position: 'bottom' as const,
      itemName: { style: { fontSize: 11 } },
      marker: { symbol: 'circle' },
    },
    tooltip: {
      title: 'sucursal',
      items: [
        ({ cantidad }: any) => ({ name: 'NCF', value: cantidad.toLocaleString() }),
      ],
    },
    xAxis: {
      label: { style: { fontSize: 12, fontWeight: 600 } },
      grid: null,
      line: { style: { stroke: '#e0e0e0' } },
    },
    yAxis: {
      grid: { line: { style: { stroke: '#f0f0f0' } } },
      label: { style: { fontSize: 11, textAlign: 'center' } },
    },
    label: {
      position: 'inside' as const,
      text: ({ cantidad }: any) => cantidad.toLocaleString(),
      style: { fontSize: 11, fill: '#fff', fontWeight: 600 },
    },
    conversionTag: {
      size: 40,
      spacing: 4,
      text: {
        formatter: (prev: number, next: number) =>
          prev ? `${((next / prev) * 100).toFixed(1)}%` : '',
      },
    },
  }), [sucursalAgrupada]);

  const donutTipoData = useMemo(() => {
    return resumen.map((r) => ({
      codigo: r.codigo,
      nombre: r.nombre || r.codigo,
      cantidad: r.cantidad,
    }));
  }, [resumen]);

  const donutTipoConfig = useMemo(() => ({
    data: donutTipoData,
    angleField: 'cantidad',
    colorField: 'codigo',
    innerRadius: 0.6,
    radius: 0.9,
    label: {
      offset: '-50%',
      content: ({ percent }: any) => `${(percent * 100).toFixed(0)}%`,
      style: { fontSize: 11, fill: '#fff', fontWeight: 600 },
    },
    color: ['#556ee6', '#34c38f', '#f0b345', '#f46a6a', '#6f42c1', '#00c4cc'],
    legend: {
      position: 'bottom' as const,
      itemName: { style: { fontSize: 11 } },
      marker: { symbol: 'circle' },
    },
    tooltip: {
      title: 'codigo',
      items: [
        ({ nombre, cantidad }: any) => ({ name: nombre, value: cantidad.toLocaleString() }),
      ],
    },
    height: 300,
  }), [donutTipoData]);

  const columnSucursalConfig = useMemo(() => {
    const data = resumenSucursal.map((r) => ({
      tipo: r.codigo,
      sucursal: SUCURSAL_NOMBRE[r.sucursal] || `Suc ${r.sucursal}`,
      cantidad: r.cantidad,
    }));

    return {
      data,
      xField: 'tipo',
      yField: 'cantidad',
      seriesField: 'sucursal',
      isGroup: true,
      height: 300,
      columnWidthRatio: 0.5,
      label: false,
      colorField: 'sucursal',
  color: ({ sucursal }: any) => SUCURSAL_COLOR[sucursal] || undefined,
      xAxis: {
        label: { autoRotate: false, style: { fontSize: 12 } },
        grid: null,
        line: { style: { stroke: '#e0e0e0' } },
      },
      yAxis: {
        grid: { line: { style: { stroke: '#f0f0f0' } } },
        label: { style: { fontSize: 11 } },
      },
      tooltip: {
        title: 'tipo',
        items: [
          ({ sucursal, cantidad }: any) => ({ name: sucursal, value: `${cantidad.toLocaleString()} documentos` }),
        ],
      },
      legend: {
        position: 'top-right' as const,
        itemSpacing: 8,
        itemName: { style: { fontSize: 11 } },
        marker: { symbol: 'circle' },
      },
    };
  }, [resumenSucursal]);

  const dataTabla = vista === 'emitidos' ? emitidos : pendientes;

  const filteredData = useMemo(() => {
    const term = searchTerm != null ? String(searchTerm).trim() : '';
    return dataTabla.filter(
      (item) =>
        !searchTerm ||
        (item.documento && item.documento.toLowerCase().includes(term.toLowerCase())) ||
        (item.ncf && item.ncf.toLowerCase().includes(term.toLowerCase())) ||
        (item.cliente && item.cliente.toLowerCase().includes(term.toLowerCase()))
    );
  }, [dataTabla, searchTerm]);

  const columns = useMemo(() => {
    const base: any[] = [
      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => <FechaColumnCell fecha={v} /> },
      { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 180 },
      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150 },
      { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', ellipsis: true, render: (v: string) => toTitleCase(v) },
      {
        title: 'QR', dataIndex: 'codigoQR', key: 'codigoQR', width: 80, align: 'center' as const,
        render: (v: string) => v ? (
          <a href={v} target="_blank" rel="noopener noreferrer" title="Ver código QR">
            <QrcodeOutlined className="paces-text-primary" style={{ fontSize: 18 }} />
          </a>
        ) : (
          <span className="paces-text-placeholder">-</span>
        ),
      },
    ];

    if (vista === 'pendientes') {
      base.splice(4, 0, {
        title: 'Mensaje DGII', dataIndex: 'respuestaDGII', key: 'respuestaDGII', width: 350,
        render: (v: string) => v ? (
          <span style={{ color: '#f46a6a', fontSize: 12 }}>{v}</span>
        ) : (
          <span className="paces-text-placeholder">-</span>
        ),
      });
    }

    base.push({
      title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 140,
      render: (v: number) => SUCURSAL_NOMBRE[v] || String(v)
    });

    return base;
  }, [vista]);

  const statCardStyle = (fondo: string) => ({
    borderRadius: 12,
    background: `linear-gradient(135deg, ${fondo} 0%, ${token.colorBgContainer} 100%)`,
    border: `1px solid ${token.colorBorderSecondary}`,
  });

  const statIconStyle = (color: string) => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  });

  const statValueStyle = (color: string) => ({
    color,
    fontWeight: 700,
    fontSize: 24,
    lineHeight: 1.2,
  });

  const COLOR_ICONO = token.colorTextLightSolid;

  const handleRangoChange = (vals: any) => {
    if (vals && vals[0] && vals[1]) {
      setFechaRango([vals[0], vals[1]]);
    }
  };

  return (
    <Spin spinning={cargando} tip="Cargando datos DGII...">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8} lg={6}>
          <RangePicker
            value={fechaRango}
            onChange={handleRangoChange}
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
          />
        </Col>
        <Col xs={12} md={4} lg={3}>
          <Select
            style={{ width: '100%' }}
            value={tamanoPagina}
            onChange={(v) => { setTamanoPagina(v); setPagina(1); }}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
        </Col>
        <Col xs={12} md={4} lg={3}>
          <PermissionGate accion="EXPORTAR">
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} block />
          </PermissionGate>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle(token.colorSuccessBg)} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle(token.colorSuccess)}>
                <FileDoneOutlined style={{ fontSize: 22, color: COLOR_ICONO }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Total Emitidos</div>
                <div style={statValueStyle(token.colorSuccess)}>{totalEmitidos.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle(token.colorErrorBg)} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle(token.colorError)}>
                <FileSyncOutlined style={{ fontSize: 22, color: COLOR_ICONO }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Total Pendientes</div>
                <div style={statValueStyle(token.colorError)}>{totalPendientes.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle(token.colorPrimaryBg)} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle(token.colorPrimary)}>
                <DollarOutlined style={{ fontSize: 22, color: COLOR_ICONO }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Monto Facturado</div>
                <div style={statValueStyle(token.colorPrimary)}>
                  ${montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle(token.colorWarningBg)} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle(token.colorWarning)}>
                <ShopOutlined style={{ fontSize: 22, color: COLOR_ICONO }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Sucursales</div>
                <div style={statValueStyle(token.colorWarning)}>{sucursalesActivas}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>


      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{vista === 'emitidos' ? 'NCF Emitidos' : 'NCF Pendientes por Enviar'}</span>
            <Radio.Group value={vista} onChange={(e) => {
              setVista(e.target.value);
              setSelectedRowKeys([]);
              setPagina(1);
              cargarTabla(1, tamanoPagina);
            }} size="small">
              <Radio.Button value="emitidos">Emitidos</Radio.Button>
              <Radio.Button value="pendientes">Pendientes</Radio.Button>
            </Radio.Group>
          </div>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar NCF, documento o Cliente"
              allowClear
              prefix={<SearchOutlined className="paces-text-icon" />}
              onSearch={handleSearch}
              style={{ width: '100%', maxWidth: 400 }}
            />
            <div style={{ flex: 1 }} />
          </div>
        </div>
        {vista === 'pendientes' && selectedRowKeys.length > 0 && (
          <div className="paces-border-bottom-light paces-bg-light-2" style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span className="paces-text-primary" style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>
              {selectedRowKeys.length}
            </span>
            <span style={{ fontSize: 13 }} className="paces-text-light">seleccionado(s)</span>
            <div style={{ flex: 1 }} />
            <PermissionGate permisoEspecial="pe_reenviar_DGII">
              <Button type="primary" size="small" icon={<SendOutlined />} disabled={procesando}
                onClick={() => handleEnviar(selectedRowKeys)}>
                Enviar
              </Button>
            </PermissionGate>
            <PermissionGate permisoEspecial="pe_preasignar_ncf">
              <Button size="small" icon={<SwapOutlined />} disabled={procesando}
                onClick={() => handleReasignar(selectedRowKeys)}>
                Reasignar
              </Button>
            </PermissionGate>
            <PermissionGate permisoEspecial="pe_marcar_enviado">
              <Button size="small" icon={<CheckOutlined />} disabled={procesando}
                onClick={() => handleMarcarEnviado(selectedRowKeys)}>
                Marcar como Enviado
              </Button>
            </PermissionGate>
          </div>
        )}
        <Table<EnvioDGIIDTO>
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            getCheckboxProps: () => ({ disabled: procesando }),
            onChange: (keys) => { if (procesandoRef.current) return; setSelectedRowKeys(keys); },
          }}
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => `${record.sucursal}-${record.transaccionID}`}
          loading={cargandoTabla}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay comprobantes registrados" />
            </div>,
          }}
          scroll={{ x: 900 }}
          size="small"
          pagination={{
            current: pagina,
            pageSize: tamanoPagina,
            total: dataTabla.length === tamanoPagina ? pagina * tamanoPagina + 1 : (pagina - 1) * tamanoPagina + dataTabla.length,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}+ registros`,
          }}
          onChange={(pagination) => {
            const newPage = pagination.current || 1;
            const newPageSize = pagination.pageSize || 25;
            setPagina(newPage);
            setTamanoPagina(newPageSize);
            cargarTabla(newPage, newPageSize);
          }}
        />
      </Card>
    </Spin>
  );
};

export default CFacturasElectronicas;
