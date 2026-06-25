import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Row, Col, Grid,
  Descriptions, Alert, Typography, Space, Input, Select, DatePicker, Tooltip, message, Modal
} from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined, FilterOutlined, FilterFilled
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { turnoApi } from '../../api/turnoApi';
import type { TurnoDTO, CobroDTO } from '../../types/turno';
import { formatCurrency, formatDate, formatDateTime, toTitleCase, formatNumber } from '../../utils/formats';
import DetalleToolbar from '../../components/DetalleToolbar';
import AsientosContableTable from '../../components/AsientosContableTable';
import LogTable from '../../components/LogTable';

const { Text } = Typography;

// ─── Componentes de filtro por columna (tipo Excel) ───────────────────────────
const FiltroTextoDropdown: React.FC<{
  confirm: () => void;
  clearFilters: () => void;
  filtroKey: string;
  placeholder: string;
  filtrosActivos: Record<string, any>;
  setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}> = ({ confirm, clearFilters, filtroKey, placeholder, filtrosActivos, setFiltrosActivos }) => {
  const filtroActual = filtrosActivos[filtroKey];
  const [operator, setOperator] = React.useState(filtroActual?.operator || 'contains');
  const [valor, setValor] = React.useState(filtroActual?.valor || '');

  const handleAplicar = () => {
    if (valor) {
      setFiltrosActivos(prev => ({ ...prev, [filtroKey]: { operator, valor } }));
    } else {
      setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    }
    confirm();
  };

  const handleLimpiar = () => {
    setOperator('contains');
    setValor('');
    clearFilters?.();
    setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    confirm();
  };

  return (
    <div style={{ padding: 12, width: 260 }}>
      <Select
        value={operator}
        onChange={setOperator}
        style={{ width: '100%', marginBottom: 8 }}
        options={[
          { value: 'contains', label: 'Contiene' },
          { value: 'startsWith', label: 'Empieza con' },
          { value: 'endsWith', label: 'Termina con' },
          { value: 'equals', label: 'Igual a' },
          { value: 'notEquals', label: 'No igual a' },
        ]}
      />
      <Input
        placeholder={placeholder}
        value={valor}
        onChange={e => setValor(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={handleLimpiar}>Limpiar</Button>
        <Button type="primary" size="small" onClick={handleAplicar}>Aplicar</Button>
      </div>
    </div>
  );
};

const FiltroFechaDropdown: React.FC<{
  confirm: () => void;
  clearFilters: () => void;
  filtroKey: string;
  filtrosActivos: Record<string, any>;
  setFiltrosActivos: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}> = ({ confirm, clearFilters, filtroKey, filtrosActivos, setFiltrosActivos }) => {
  const [fechas, setFechas] = React.useState<any>(null);

  const handleAplicar = () => {
    if (fechas && fechas[0] && fechas[1]) {
      setFiltrosActivos(prev => ({
        ...prev,
        [filtroKey]: { value: [fechas[0].toISOString(), fechas[1].toISOString()] }
      }));
    } else {
      setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    }
    confirm();
  };

  const handleLimpiar = () => {
    setFechas(null);
    clearFilters?.();
    setFiltrosActivos(prev => { const n = { ...prev }; delete n[filtroKey]; return n; });
    confirm();
  };

  return (
    <div style={{ padding: 12, width: 260 }}>
      <DatePicker.RangePicker
        value={fechas}
        onChange={dates => setFechas(dates)}
        style={{ width: '100%', marginBottom: 8 }}
        placeholder={['Fecha desde', 'Fecha hasta']}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button size="small" onClick={handleLimpiar}>Limpiar</Button>
        <Button type="primary" size="small" onClick={handleAplicar}>Aplicar</Button>
      </div>
    </div>
  );
};

const TurnoDetalle: React.FC = () => {
  const { noTurno } = useParams<{ noTurno: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalContable = useAuthStore((s: any) => s.sucursalContable);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['turnoDetalle', sucursalActiva, noTurno],
    queryFn: async () => {
      if (!noTurno) throw new Error('NoTurno es requerido');
      return turnoApi.obtenerPorNoTurno(sucursalActiva, noTurno);
    },
    enabled: !!noTurno && sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule('FTURNOS');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (data) {
      setPageTitleOverride(`Turno: ${data.noTurno}`);
    }
  }, [data, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePostear = () => {
    Modal.confirm({
      title: 'Postear Turno',
      content: `¿Está seguro de generar los asientos contables del turno ${data?.noTurno}?`,
      okText: 'Postear',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!data) return;
        setPosteando(true);
        try {
          await turnoApi.postear(sucursalActiva, data.noTurno, sucursalContable);
          message.success('Turno posteado correctamente');
          refetch();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al postear el turno');
        } finally {
          setPosteando(false);
        }
      },
    });
  };

  // Calcular cobros totales
  const cobrosTotales: CobroDTO = React.useMemo(() => {
    if (!data?.cobros?.length) return {
      efectivo: 0, cheque: 0, transferencia: 0,
      tarjetaCredito: 0, tarjetaDebito: 0, bono: 0,
      tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaId: 0,
    };
    return data.cobros.reduce((acc: CobroDTO, c: CobroDTO) => ({
      efectivo: acc.efectivo + (c.efectivo || 0),
      cheque: acc.cheque + (c.cheque || 0),
      transferencia: acc.transferencia + (c.transferencia || 0),
      tarjetaCredito: acc.tarjetaCredito + (c.tarjetaCredito || 0),
      tarjetaDebito: acc.tarjetaDebito + (c.tarjetaDebito || 0),
      bono: acc.bono + (c.bono || 0),
      tarjetaRegalo: acc.tarjetaRegalo + (c.tarjetaRegalo || 0),
      notaCredito: acc.notaCredito + (c.notaCredito || 0),
      pago: acc.pago + (c.pago || 0),
      devuelta: acc.devuelta + (c.devuelta || 0),
      facturaId: 0,
    }), { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaId: 0 });
  }, [data?.cobros]);

  const cobrado = data?.cobros?.reduce((sum, c) => sum +
    (c.efectivo || 0) + (c.cheque || 0) + (c.transferencia || 0) +
    (c.tarjetaCredito || 0) + (c.tarjetaDebito || 0) + (c.bono || 0) +
    (c.tarjetaRegalo || 0) + (c.notaCredito || 0), 0) ?? 0;
  const total = data?.total ?? 0;
  const porCobrar = total - cobrado;

  // Columnas de facturas con filtro tipo Excel
  const facturaColumns = [
    {
      title: 'No. Documento',
      key: 'noDocumento',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroTextoDropdown
          confirm={confirm}
          clearFilters={clearFilters}
          filtroKey="noDocumento"
          placeholder="Buscar documento..."
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
        />
      ),
      filterIcon: () => filtrosActivos.noDocumento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <Text className="paces-doc-link">
          {record.noDocumento || record.documento || '-'}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 140,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroFechaDropdown
          confirm={confirm}
          clearFilters={clearFilters}
          filtroKey="fechaDocumento"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
        />
      ),
      filterIcon: () => filtrosActivos.fechaDocumento
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (val: string) => <Text>{val ? formatDate(val) : '-'}</Text>,
    },
    {
      title: 'Entidad/Cliente',
      key: 'cliente',
      width: 250,
      ellipsis: true,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroTextoDropdown
          confirm={confirm}
          clearFilters={clearFilters}
          filtroKey="cliente"
          placeholder="Buscar cliente..."
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
        />
      ),
      filterIcon: () => filtrosActivos.cliente
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <Text>{record.cliente?.nombre || '-'}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
  ];

  // Columnas de desglose cobros
  const metodoPagoColumns = [
    {
      title: 'Método de Pago',
      key: 'metodo',
      render: (_: any, record: any) => <Text>{record.metodo}</Text>,
    },
    {
      title: 'Monto',
      key: 'monto',
      align: 'right' as const,
      width: 160,
      render: (_: any, record: any) => <Text strong>{formatCurrency(record.monto)}</Text>,
    },
  ];

  const metodosPago = [
    { metodo: 'Efectivo', monto: cobrosTotales.efectivo, key: 'efectivo' },
    { metodo: 'Cheque', monto: cobrosTotales.cheque, key: 'cheque' },
    { metodo: 'Transferencia', monto: cobrosTotales.transferencia, key: 'transferencia' },
    { metodo: 'Tarjeta Crédito', monto: cobrosTotales.tarjetaCredito, key: 'tarjetaCredito' },
    { metodo: 'Tarjeta Débito', monto: cobrosTotales.tarjetaDebito, key: 'tarjetaDebito' },
    { metodo: 'Bono', monto: cobrosTotales.bono, key: 'bono' },
    { metodo: 'Tarjeta Regalo', monto: cobrosTotales.tarjetaRegalo, key: 'tarjetaRegalo' },
    { metodo: 'Nota Crédito', monto: cobrosTotales.notaCredito, key: 'notaCredito' },
  ].filter(m => m.monto !== 0);

  const loading = isLoading;
  const loadingError = isError;

  const [filtrosActivos, setFiltrosActivos] = useState<Record<string, any>>({});
  const [costosSearch, setCostosSearch] = useState('');
  const [ingresosSearch, setIngresosSearch] = useState('');
  const [posteando, setPosteando] = useState(false);
  const asientos = data?.factura?.asientos || [];
  const logs = data?.factura?.logs || [];
  const detalles = data?.factura?.detalles || [];

  // ─── Helpers de filtros ──────────────────────────────────────────────────────
  const limpiarFiltro = React.useCallback((key: string) => {
    setFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltros = React.useCallback(() => {
    setFiltrosActivos({});
  }, []);

  const documentosFiltrados = React.useMemo(() => {
    let result = data?.facturas || [];

    Object.entries(filtrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((doc: any) => {
        if (key === 'noDocumento') {
          const val = (doc.noDocumento || doc.documento || '').toLowerCase();
          const search = (filtro.valor || '').toLowerCase();
          if (filtro.operator === 'contains') return val.includes(search);
          if (filtro.operator === 'startsWith') return val.startsWith(search);
          if (filtro.operator === 'endsWith') return val.endsWith(search);
          if (filtro.operator === 'equals') return val === search;
          if (filtro.operator === 'notEquals') return val !== search;
          return true;
        }
        if (key === 'cliente') {
          const val = (doc.cliente?.nombre || '').toLowerCase();
          const search = (filtro.valor || '').toLowerCase();
          if (filtro.operator === 'contains') return val.includes(search);
          if (filtro.operator === 'startsWith') return val.startsWith(search);
          if (filtro.operator === 'endsWith') return val.endsWith(search);
          if (filtro.operator === 'equals') return val === search;
          if (filtro.operator === 'notEquals') return val !== search;
          return true;
        }
        if (key === 'fechaDocumento') {
          const docFecha = doc.fechaDocumento ? new Date(doc.fechaDocumento).getTime() : 0;
          const desde = filtro.value?.[0] ? new Date(filtro.value[0]).getTime() : 0;
          const hasta = filtro.value?.[1] ? new Date(filtro.value[1]).getTime() : Infinity;
          return docFecha >= desde && docFecha <= hasta;
        }
        return true;
      });
    });

    return result;
  }, [data?.facturas, filtrosActivos]);

  const costosFiltrados = React.useMemo(() => {
    if (!costosSearch) return detalles;
    const q = costosSearch.toLowerCase();
    return detalles.filter((d: any) =>
      (d.codigo?.toLowerCase() || '').includes(q) ||
      (d.articulo?.toLowerCase() || '').includes(q) ||
      (d.referencia?.toLowerCase() || '').includes(q)
    );
  }, [costosSearch, detalles]);

  const ingresosFiltrados = React.useMemo(() => {
    if (!ingresosSearch) return detalles;
    const q = ingresosSearch.toLowerCase();
    return detalles.filter((d: any) =>
      (d.codigo?.toLowerCase() || '').includes(q) ||
      (d.articulo?.toLowerCase() || '').includes(q) ||
      (d.referencia?.toLowerCase() || '').includes(q)
    );
  }, [ingresosSearch, detalles]);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando detalle del turno...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return (
      <div>
        <Alert
          message="Error al cargar detalle del turno"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FTURNOS')}>
          Volver
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const estadoTag = data.cerrado
    ? <Tag color="green">Cerrado</Tag>
    : <Tag color="warning">Abierto</Tag>;

  const contentCard = (
    <Card
      className="paces-card"
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
          <Space>
            {estadoTag}
          </Space>
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions
        bordered
        size="small"
        column={isLarge ? 3 : 1}
        styles={{ content: { background: 'transparent' } }}
      >
        <Descriptions.Item label="No. Turno">
          {data.noTurno}
        </Descriptions.Item>
        <Descriptions.Item label="Cajero">
          {toTitleCase(data.usuario?.nombre || '')}
        </Descriptions.Item>
        <Descriptions.Item label="POS">
          {data.nombrePOS || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Apertura">
          {formatDateTime(data.fechaApertura)}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Cierre">
          {data.fechaCierre ? formatDateTime(data.fechaCierre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Cerrado">
          <Tag color={data.cerrado ? 'green' : 'default'}>
            {data.cerrado ? 'Sí' : 'No'}
          </Tag>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const costosColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 13 }}>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatNumber(record.costo || 0)}</div>
          {record.medida?.factor && record.medida.factor !== 1 && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
              × {record.medida.factor}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  const ingresosColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{record.codigo || '-'}</div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 13 }}>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <Tooltip title={record.medida.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida.nombre}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatNumber(record.precio || 0)}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  const nDetalles = detalles.length;

  const tabsItems = [
    {
      key: 'documentos',
      label: `Documentos (${
        Object.keys(filtrosActivos).length > 0
          ? `${documentosFiltrados.length}/${data?.facturas?.length || 0}`
          : data?.facturas?.length || 0
      })`,
      children: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }}>
            {Object.keys(filtrosActivos).length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 13 }}>Filtros:</Text>
                {Object.entries(filtrosActivos).map(([key, f]) => (
                  <Tag key={key} closable onClose={() => limpiarFiltro(key)}>
                    {key === 'noDocumento' ? 'No. Documento' : key === 'cliente' ? 'Entidad/Cliente' : key === 'fechaDocumento' ? 'Fecha' : key}: {f?.valor || `${f?.value?.[0] || ''} - ${f?.value?.[1] || ''}`}
                  </Tag>
                ))}
                <Button size="small" onClick={limpiarTodosFiltros} type="link" style={{ padding: 0 }}>
                  Limpiar filtros
                </Button>
              </>
            )}
            <div style={{ flex: 1 }} />
          </div>
          <Table
            dataSource={documentosFiltrados}
            columns={facturaColumns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 25,
              showSizeChanger: false,
              showTotal: (total: number) => `${total} registros`,
            }}
            scroll={{ x: 900, y: 400 }}
            locale={{ emptyText: 'Sin facturas registradas' }}
          />
        </div>
      ),
    },
    {
      key: 'detallesCostos',
      label: `Costos (${costosSearch ? `${costosFiltrados.length}/${detalles.length}` : detalles.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Input.Search
              placeholder="Buscar producto..."
              allowClear
              style={{ maxWidth: 250 }}
              onSearch={(value) => setCostosSearch(value)}
              onChange={(e) => { if (!e.target.value) setCostosSearch(''); }}
            />
          </div>
          <Table
            dataSource={costosFiltrados}
            columns={costosColumns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 25,
              showSizeChanger: false,
              showTotal: (total: number) => `${total} registros`,
            }}
            scroll={{ x: 900, y: 400 }}
            locale={{ emptyText: 'Sin detalles de costo' }}
          />
        </div>
      ),
    },
    {
      key: 'detallesIngresos',
      label: `Ingresos (${ingresosSearch ? `${ingresosFiltrados.length}/${detalles.length}` : detalles.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Input.Search
              placeholder="Buscar producto..."
              allowClear
              style={{ maxWidth: 250 }}
              onSearch={(value) => setIngresosSearch(value)}
              onChange={(e) => { if (!e.target.value) setIngresosSearch(''); }}
            />
          </div>
          <Table
            dataSource={ingresosFiltrados}
            columns={ingresosColumns}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 25,
              showSizeChanger: false,
              showTotal: (total: number) => `${total} registros`,
            }}
            scroll={{ x: 900, y: 400 }}
            locale={{ emptyText: 'Sin detalles de ingreso' }}
          />
        </div>
      ),
    },
    {
      key: 'cobros',
      label: `Cobros (${data.cobros?.length || 0})`,
      children: (
        <div>
          <Table
            dataSource={metodosPago}
            columns={metodoPagoColumns}
            rowKey="key"
            size="small"
            pagination={false}
            style={{ marginBottom: 16 }}
            locale={{ emptyText: 'Sin cobros registrados' }}
          />
          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>Totales</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span className="paces-text-secondary">Total Facturado</span>
                <Text strong>{formatCurrency(total)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span className="paces-text-secondary">Cobrado</span>
                <Text strong style={{ color: '#34c38f' }}>{formatCurrency(cobrado)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span className="paces-text-secondary">Devuelta</span>
                <Text strong>{formatCurrency(cobrosTotales.devuelta)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span className="paces-text-secondary">Por Cobrar</span>
                <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959' }}>
                  {formatCurrency(porCobrar)}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    ...(asientos.length > 0 ? [{
      key: 'asientos',
      label: `Asientos (${asientos.length})`,
      children: <AsientosContableTable asientos={asientos} scroll={{ x: 800 }} />,
    }] : []),
    ...(logs.length > 0 ? [{
      key: 'historial',
      label: `Historial (${logs.length})`,
      children: <LogTable dataSource={logs} scroll={{ x: 800 }} />,
    }] : []),
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del turno"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}

      <DetalleToolbar
        modulo="FTURNOS"
        estado={data.cerrado ? 1 : 0}
        periodo={data.periodo ?? 0}
        saving={posteando}
        onVolver={() => navigate('/FTURNOS')}
        onPostear={handlePostear}
        extraButtons={<Button icon={<ReloadOutlined />} onClick={handleRefresh} />}
      />

      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {contentCard}
            <Tabs defaultActiveKey="documentos" type="card" items={tabsItems} />
          </Col>
          <Col xxl={6}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Totales</span>}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Total Facturado</span>
                  <Text strong>{formatCurrency(total)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Cobrado</span>
                  <Text strong style={{ color: '#34c38f' }}>{formatCurrency(cobrado)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Por Cobrar</span>
                  <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959' }}>
                    {formatCurrency(porCobrar)}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        <div>
          {contentCard}
          <Tabs defaultActiveKey="documentos" type="card" items={tabsItems} />
        </div>
      )}
    </div>
  );
};

export default TurnoDetalle;
