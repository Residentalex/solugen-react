import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Radio,
  Table,
  Button,
  message,
  Modal,
  Spin,
} from 'antd';
import { Pie, Column, Bar } from '@ant-design/charts';
import {
  FileDoneOutlined,
  FileSyncOutlined,
  DollarOutlined,
  ShopOutlined,
  QrcodeOutlined,
  SendOutlined,
  SwapOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
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
    return ids
      .map((id) => pendientes.find((p) => p.id === id))
      .filter((x): x is EnvioDGIIDTO => x != null);
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

    Modal.confirm({
      title: 'Reenviar a DGII',
      content: `¿Está seguro que desea reenviar ${items.length} comprobante(s)?`,
      okText: 'Sí, enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        const errores: string[] = [];
        const key = 'envio';
        message.loading({ content: `Enviando 0 / ${items.length}...`, key, duration: 0 });

        const maxParalelo = 5;
        let completados = 0;

        const nextTask = async (item: EnvioDGIIDTO) => {
          try {
            await dgiiApi.cargarYEnviarFactura(item.sucursal, item.transaccionID, item.tipoDocumento);
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
        }
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina]);

  const handleReasignar = useCallback(async (ids: React.Key[]) => {
    const items = getSelectedItems(ids);
    if (items.length === 0) return;

    Modal.confirm({
      title: 'Reasignar NCF',
      content: `¿Está seguro que desea reasignar NCF a ${items.length} comprobante(s)?`,
      okText: 'Sí, reasignar',
      cancelText: 'Cancelar',
      onOk: async () => {
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
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina]);

  const handleMarcarEnviado = useCallback(async (ids: React.Key[]) => {
    const items = getSelectedItems(ids);
    if (items.length === 0) return;

    Modal.confirm({
      title: 'Marcar como Enviado',
      content: `¿Está seguro que desea marcar como enviado ${items.length} comprobante(s)?`,
      okText: 'Sí, marcar',
      cancelText: 'Cancelar',
      onOk: async () => {
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
      },
    });
  }, [pendientes, cargarTabla, tamanoPagina]);

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

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => v?.split('T')[0] },
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 180 },
    { title: 'Tipo', dataIndex: 'tipoDocumento', key: 'tipoDocumento', width: 80, align: 'center' as const },
    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150 },
    { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', ellipsis: true, render: (v: string) => toTitleCase(v) },
    {
      title: 'QR', dataIndex: 'codigoQR', key: 'codigoQR', width: 80, align: 'center' as const,
      render: (v: string) => v ? (
        <a href={v} target="_blank" rel="noopener noreferrer" title="Ver código QR">
          <QrcodeOutlined style={{ fontSize: 18, color: '#556ee6' }} />
        </a>
      ) : (
        <span className="paces-text-placeholder">-</span>
      ),
    },
    {
      title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 140,
      render: (v: number) => SUCURSAL_NOMBRE[v] || `Sucursal ${v}`,
    },
  ];

  const statCardStyle = (color: string) => ({
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
    border: `1px solid ${color}30`,
  });

  const statIconStyle = (color: string) => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
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
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle('#34c38f')} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle('#34c38f')}>
                <FileDoneOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Total Emitidos</div>
                <div style={statValueStyle('#34c38f')}>{totalEmitidos.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle('#f46a6a')} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle('#f46a6a')}>
                <FileSyncOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Total Pendientes</div>
                <div style={statValueStyle('#f46a6a')}>{totalPendientes.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle('#6f42c1')} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle('#6f42c1')}>
                <DollarOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Monto Facturado</div>
                <div style={statValueStyle('#6f42c1')}>
                  ${montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={statCardStyle('#f0b345')} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={statIconStyle('#f0b345')}>
                <ShopOutlined style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }} className="paces-text-light">Sucursales</div>
                <div style={statValueStyle('#f0b345')}>{sucursalesActivas}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card
            title="Participación por Tipo NCF"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '16px 24px' } }}
          >
            {donutTipoData.length > 0 ? (
              <Pie {...(donutTipoConfig as any)} />
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }} className="paces-text-placeholder">Sin datos</div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="NCF Emitidos por Sucursal"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '16px 24px' } }}
          >
            {sucursalAgrupada.length > 0 ? (
              <Bar {...(barSucursalConfig as any)} />
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }} className="paces-text-placeholder">Sin datos</div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Facturado por Tipo NCF y Sucursal"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '16px 24px' } }}
          >
            {resumenSucursal.length > 0 ? (
              <Column {...(columnSucursalConfig as any)} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }} className="paces-text-placeholder">Sin datos</div>
            )}
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
        {vista === 'pendientes' && selectedRowKeys.length > 0 && (
          <div className="paces-border-bottom-light paces-bg-light-2" style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 13, color: '#556ee6', fontWeight: 600, marginRight: 4 }}>
              {selectedRowKeys.length}
            </span>
            <span style={{ fontSize: 13 }} className="paces-text-light">seleccionado(s)</span>
            <div style={{ flex: 1 }} />
            <Button type="primary" size="small" icon={<SendOutlined />}
              onClick={() => handleEnviar(selectedRowKeys)}>
              Enviar
            </Button>
            <Button size="small" icon={<SwapOutlined />}
              onClick={() => handleReasignar(selectedRowKeys)}>
              Reasignar
            </Button>
            <Button size="small" icon={<CheckOutlined />}
              onClick={() => handleMarcarEnviado(selectedRowKeys)}>
              Marcar como Enviado
            </Button>
          </div>
        )}
        <Table<EnvioDGIIDTO>
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={dataTabla}
          rowKey="id"
          loading={cargandoTabla}
          scroll={{ x: 900 }}
          size="small"
          pagination={{
            current: pagina,
            pageSize: tamanoPagina,
            total: dataTabla.length === tamanoPagina ? pagina * tamanoPagina + 1 : (pagina - 1) * tamanoPagina + dataTabla.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50'],
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
