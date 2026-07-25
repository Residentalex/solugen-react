import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Grid, Divider,
  Descriptions, Alert, Typography, Space, Input, DatePicker, Tooltip, message, Modal
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
import FiltroSeleccionDropdown from '../../components/FiltroSeleccionDropdown';

const { Text } = Typography;

// ─── Componente de filtro por rango de fechas ─────────────────────────────────
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
      tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0,
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
      facturaID: 0,
    }), { efectivo: 0, cheque: 0, transferencia: 0, tarjetaCredito: 0, tarjetaDebito: 0, bono: 0, tarjetaRegalo: 0, notaCredito: 0, pago: 0, devuelta: 0, facturaID: 0 });
  }, [data?.cobros]);

  const cobrado = data?.cobros?.reduce((sum, c) => sum +
    (c.efectivo || 0) + (c.cheque || 0) + (c.transferencia || 0) +
    (c.tarjetaCredito || 0) + (c.tarjetaDebito || 0) + (c.bono || 0) +
    (c.tarjetaRegalo || 0) + (c.notaCredito || 0), 0) ?? 0;
  const total = data?.total ?? 0;
  const porCobrar = total - cobrado;

  // Mapa de pagos por factura
  const pagosPorFactura: Record<number, { metodos: Array<{ key: string; label: string; monto: number }>; totalPagado: number }> = React.useMemo(() => {
    const mapa: Record<number, { metodos: Array<{ key: string; label: string; monto: number }>; totalPagado: number }> = {};
    if (!data?.cobros) return mapa;
    data.cobros.forEach((c: CobroDTO) => {
      if (!mapa[c.facturaID]) {
        mapa[c.facturaID] = { metodos: [], totalPagado: 0 };
      }
      const metodos: Array<{ key: string; label: string; monto: number }> = [];
      if (c.efectivo > 0) metodos.push({ key: 'efectivo', label: 'Efvo.', monto: c.efectivo });
      if (c.cheque > 0) metodos.push({ key: 'cheque', label: 'Cheque', monto: c.cheque });
      if (c.transferencia > 0) metodos.push({ key: 'transferencia', label: 'Transf.', monto: c.transferencia });
      if (c.tarjetaCredito > 0) metodos.push({ key: 'tarjetaCredito', label: 'T.Créd.', monto: c.tarjetaCredito });
      if (c.tarjetaDebito > 0) metodos.push({ key: 'tarjetaDebito', label: 'T.Déb.', monto: c.tarjetaDebito });
      if (c.bono > 0) metodos.push({ key: 'bono', label: 'Bono', monto: c.bono });
      if (c.tarjetaRegalo > 0) metodos.push({ key: 'tarjetaRegalo', label: 'T.Reg.', monto: c.tarjetaRegalo });
      if (c.notaCredito > 0) metodos.push({ key: 'notaCredito', label: 'N.Créd.', monto: c.notaCredito });
      mapa[c.facturaID].metodos.push(...metodos);
      mapa[c.facturaID].totalPagado += metodos.reduce((sum, m) => sum + m.monto, 0);
    });
    return mapa;
  }, [data?.cobros]);

  // Columnas de facturas con filtro tipo Excel
  const facturaColumns = [
    {
      title: 'No. Documento',
      key: 'noDocumento',
      width: 160,
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={data?.facturas || []}
          dataIndex="noDocumento"
          render={(r: any) => r.noDocumento || r.documento || ''}
          placeholder="Buscar documento..."
          filtroKey="noDocumento"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
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
        <FiltroSeleccionDropdown
          dataSource={data?.facturas || []}
          dataIndex="cliente"
          render={(r: any) => r.cliente?.nombre || ''}
          placeholder="Buscar cliente..."
          filtroKey="cliente"
          filtrosActivos={filtrosActivos}
          setFiltrosActivos={setFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
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
      title: 'Pagos',
      key: 'pagos',
      width: 220,
      render: (_: any, record: any) => {
        const pagos = pagosPorFactura[record.id];
        if (!pagos || pagos.metodos.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Sin pago</Text>;
        }
        const colorMap: Record<string, string> = {
          efectivo: 'green',
          cheque: 'blue',
          transferencia: 'purple',
          tarjetaCredito: 'cyan',
          tarjetaDebito: 'geekblue',
          bono: 'gold',
          tarjetaRegalo: 'orange',
          notaCredito: 'volcano',
        };
        return (
          <Space size={[4, 4]} wrap>
            {pagos.metodos.map((m) => (
              <Tooltip key={m.key} title={formatCurrency(m.monto)}>
                <Tag color={colorMap[m.key]} style={{ margin: 0 }}>{m.label}</Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
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
  const [costosFiltrosActivos, setCostosFiltrosActivos] = useState<Record<string, any>>({});
  const [ingresosFiltrosActivos, setIngresosFiltrosActivos] = useState<Record<string, any>>({});
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

  const limpiarFiltroCostos = React.useCallback((key: string) => {
    setCostosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltrosCostos = React.useCallback(() => {
    setCostosFiltrosActivos({});
  }, []);

  const limpiarFiltroIngresos = React.useCallback((key: string) => {
    setIngresosFiltrosActivos(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const limpiarTodosFiltrosIngresos = React.useCallback(() => {
    setIngresosFiltrosActivos({});
  }, []);

  const documentosFiltrados = React.useMemo(() => {
    let result = data?.facturas || [];

    Object.entries(filtrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((doc: any) => {
        if (key === 'noDocumento') {
          const val = doc.noDocumento || doc.documento || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'cliente') {
          const val = doc.cliente?.nombre || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
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
    let result = detalles;

    // Apply column filters
    Object.entries(costosFiltrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((d: any) => {
        if (key === 'codigo') {
          const val = d.codigo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'articulo') {
          const val = d.articulo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        return true;
      });
    });

    // Apply text search
    if (costosSearch) {
      const q = costosSearch.toLowerCase();
      result = result.filter((d: any) =>
        (d.codigo?.toLowerCase() || '').includes(q) ||
        (d.articulo?.toLowerCase() || '').includes(q) ||
        (d.referencia?.toLowerCase() || '').includes(q)
      );
    }

    return result;
  }, [costosSearch, detalles, costosFiltrosActivos]);

  const ingresosFiltrados = React.useMemo(() => {
    let result = detalles;

    // Apply column filters
    Object.entries(ingresosFiltrosActivos).forEach(([key, filtro]) => {
      if (!filtro) return;
      result = result.filter((d: any) => {
        if (key === 'codigo') {
          const val = d.codigo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'articulo') {
          const val = d.articulo || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        if (key === 'impuesto') {
          const val = d.impuesto?.nombre || '';
          return Array.isArray(filtro.valor) ? filtro.valor.includes(val) : true;
        }
        return true;
      });
    });

    // Apply text search
    if (ingresosSearch) {
      const q = ingresosSearch.toLowerCase();
      result = result.filter((d: any) =>
        (d.codigo?.toLowerCase() || '').includes(q) ||
        (d.articulo?.toLowerCase() || '').includes(q) ||
        (d.referencia?.toLowerCase() || '').includes(q)
      );
    }

    return result;
  }, [ingresosSearch, detalles, ingresosFiltrosActivos]);

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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
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
      <Divider plain style={{ margin: '8px 0', fontSize: 12 }}>Totales</Divider>
      <div style={{ display: 'flex', flexDirection: isLarge ? 'row' : 'column', gap: 16, padding: '0 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Total Facturado</span>
          <Text strong>{formatCurrency(total)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Cobrado</span>
          <Text strong style={{ color: '#34c38f' }}>{formatCurrency(cobrado)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
          <span className="paces-text-secondary">Por Cobrar</span>
          <Text strong style={{ color: porCobrar > 0 ? '#f46a6a' : '#595959' }}>
            {formatCurrency(porCobrar)}
          </Text>
        </div>
      </div>
    </Card>
  );

  const costosColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 120,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="codigo"
          placeholder="Buscar código..."
          filtroKey="codigo"
          filtrosActivos={costosFiltrosActivos}
          setFiltrosActivos={setCostosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => costosFiltrosActivos.codigo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
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
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="articulo"
          placeholder="Buscar artículo..."
          filtroKey="articulo"
          filtrosActivos={costosFiltrosActivos}
          setFiltrosActivos={setCostosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => costosFiltrosActivos.articulo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
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
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="codigo"
          placeholder="Buscar código..."
          filtroKey="codigo"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.codigo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
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
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="articulo"
          placeholder="Buscar artículo..."
          filtroKey="articulo"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.articulo
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
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
      title: 'Impuestos',
      dataIndex: 'impuestos',
      key: 'impuestos',
      width: 180,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <FiltroSeleccionDropdown
          dataSource={detalles}
          dataIndex="impuesto"
          render={(r: any) => r.impuesto?.nombre || ''}
          placeholder="Buscar impuesto..."
          filtroKey="impuesto"
          filtrosActivos={ingresosFiltrosActivos}
          setFiltrosActivos={setIngresosFiltrosActivos}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
      filterIcon: () => ingresosFiltrosActivos.impuesto
        ? <FilterFilled style={{ color: '#556ee6', fontSize: 12 }} />
        : <FilterOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatCurrency(record.impuestos || 0)}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>
            {record.impuesto?.nombre || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Descuentos',
      dataIndex: 'descuento',
      key: 'descuento',
      width: 130,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{formatCurrency(record.descuento || 0)}</div>
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
                    {key === 'noDocumento' ? 'No. Documento' : key === 'cliente' ? 'Entidad/Cliente' : key === 'fechaDocumento' ? 'Fecha' : key}: {Array.isArray(f?.valor) ? f.valor.join(', ') : f?.valor || `${f?.value?.[0] || ''} - ${f?.value?.[1] || ''}`}
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
            scroll={{ x: 1100 }}
            locale={{ emptyText: 'Sin facturas registradas' }}
          />
        </div>
      ),
    },
    {
      key: 'detallesCostos',
      label: `Costos (${
        costosSearch || Object.keys(costosFiltrosActivos).length > 0
          ? `${costosFiltrados.length}/${detalles.length}`
          : detalles.length
      })`,
      children: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }}>
            {Object.keys(costosFiltrosActivos).length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 13 }}>Filtros:</Text>
                {Object.entries(costosFiltrosActivos).map(([key, f]) => (
                  <Tag key={key} closable onClose={() => limpiarFiltroCostos(key)}>
                    {key === 'codigo' ? 'Código' : key === 'articulo' ? 'Artículo' : key}: {Array.isArray(f?.valor) ? f.valor.join(', ') : f?.valor || ''}
                  </Tag>
                ))}
                <Button size="small" onClick={limpiarTodosFiltrosCostos} type="link" style={{ padding: 0 }}>
                  Limpiar filtros
                </Button>
              </>
            )}
            <div style={{ flex: 1 }} />
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
            scroll={{ x: 900 }}
            locale={{ emptyText: 'Sin detalles de costo' }}
          />
        </div>
      ),
    },
    {
      key: 'detallesIngresos',
      label: `Ingresos (${
        ingresosSearch || Object.keys(ingresosFiltrosActivos).length > 0
          ? `${ingresosFiltrados.length}/${detalles.length}`
          : detalles.length
      })`,
      children: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minHeight: 32 }}>
            {Object.keys(ingresosFiltrosActivos).length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 13 }}>Filtros:</Text>
                {Object.entries(ingresosFiltrosActivos).map(([key, f]) => (
                  <Tag key={key} closable onClose={() => limpiarFiltroIngresos(key)}>
                    {key === 'codigo' ? 'Código' : key === 'articulo' ? 'Artículo' : key === 'impuesto' ? 'Impuesto' : key}: {Array.isArray(f?.valor) ? f.valor.join(', ') : f?.valor || ''}
                  </Tag>
                ))}
                <Button size="small" onClick={limpiarTodosFiltrosIngresos} type="link" style={{ padding: 0 }}>
                  Limpiar filtros
                </Button>
              </>
            )}
            <div style={{ flex: 1 }} />
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
            scroll={{ x: 1100 }}
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
        onVolver={() => navigate(-1)}
        onPostear={handlePostear}
        extraButtons={<Button icon={<ReloadOutlined />} onClick={handleRefresh} />}
      />

      <div>
        {contentCard}
        <Tabs defaultActiveKey="documentos" type="card" items={tabsItems} />
      </div>
    </div>
  );
};

export default TurnoDetalle;
