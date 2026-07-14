import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Typography, Button, Space, Tag, message, Spin, Empty,
  Table, theme, Tooltip, Segmented, Modal, Checkbox, Input, Select, Skeleton,
} from 'antd';
import {
  DollarOutlined, ShoppingCartOutlined, FileTextOutlined,
  OrderedListOutlined, TeamOutlined, InboxOutlined,
  RiseOutlined, SyncOutlined, ReloadOutlined,
  SettingOutlined, SearchOutlined,
  BarChartOutlined, LineChartOutlined, WarningOutlined,
  UserOutlined, RocketOutlined, CheckCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { dashboardApi } from '../../api/dashboardApi';
import type {
  DashboardResumenDTO, DocumentoRecienteDTO,
  VentaPorMesDTO, DocumentosPorTipoDTO,
  SucursalComparativoDTO, SucursalActivaDTO, ProductoStockNegativoDTO,
  EvolucionDiariaDTO, EnvioDGIIDTO,
} from '../../api/dashboardApi';
import EntidadImagen from '../../components/EntidadImagen';
import { formatDateParam, formatCurrency, formatNumber, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import type { PantallaDTO } from '../../types/auth';

const { Text } = Typography;

const STORAGE_KEY = 'solugen-quick-access';

function obtenerPreferidas(usuarioID: number): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${usuarioID}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function guardarPreferidas(usuarioID: number, codigos: string[]) {
  localStorage.setItem(`${STORAGE_KEY}-${usuarioID}`, JSON.stringify(codigos));
}

function formatKPIValue(value: number, kind: 'currency' | 'number'): string {
  if (kind === 'currency') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    try { return formatNumber(value); } catch { return value.toLocaleString('es-DO'); }
  }
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('es-DO');
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const companyData = useCompanyStore((s) => s.data);
  const { token: themeToken } = theme.useToken();

  // ── Estados ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<DashboardResumenDTO | null>(null);
  const [recientes, setRecientes] = useState<DocumentoRecienteDTO[]>([]);
  const [ventasPorMes, setVentasPorMes] = useState<VentaPorMesDTO[]>([]);
  const [docsPorTipo, setDocsPorTipo] = useState<DocumentosPorTipoDTO[]>([]);
  const [comparativo, setComparativo] = useState<SucursalComparativoDTO[]>([]);
  const [evolucionDiaria, setEvolucionDiaria] = useState<EvolucionDiariaDTO[]>([]);
const [pendientesNCF, setPendientesNCF] = useState<EnvioDGIIDTO[]>([]);
const [docsNoCuadrados, setDocsNoCuadrados] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes');

  // Estados accesos rápidos
  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');

  // Estados stock negativo
  const [sucursalesActivas, setSucursalesActivas] = useState<SucursalActivaDTO[]>([]);
  const [sucursalStock, setSucursalStock] = useState<string>('');
  const [stockNegativo, setStockNegativo] = useState<ProductoStockNegativoDTO[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [totalStock, setTotalStock] = useState(0);
  const [paginaStock, setPaginaStock] = useState(1);
  const pageSizeStock = 10;

  const preferidas = obtenerPreferidas(usuario?.id ?? 0);
  const todasPantallas = usuario?.pantallas || [];
  const pantallasVisibles = preferidas.length > 0
    ? todasPantallas.filter((p) => preferidas.includes(p.codigo))
    : todasPantallas.slice(0, 6);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  // ── Carga de datos ──────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const now = new Date();

    let desde: string;
    let meses: number;

    switch (periodo) {
      case 'dia':
        desde = formatDateParam(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        meses = 1;
        break;
      case 'semana':
        desde = formatDateParam(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        meses = 3;
        break;
      case 'ano':
        desde = formatDateParam(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
        meses = 12;
        break;
      case 'mes':
      default:
        desde = formatDateParam(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
        meses = 6;
        break;
    }

    const hasta = formatDateParam(now);

    try {
      const [res, rec, ventas, docs, comp, evolucion] = await Promise.all([
        dashboardApi.obtenerResumen(sucursalActiva, desde, hasta),
        dashboardApi.obtenerRecientes(sucursalActiva, 10),
        dashboardApi.obtenerVentasPorMes(sucursalActiva, meses),
        dashboardApi.obtenerDocsPorTipo(sucursalActiva, desde, hasta),
        dashboardApi.obtenerComparativoSucursales(desde, hasta),
        dashboardApi.obtenerEvolucionDiaria(sucursalActiva, desde, hasta),
      ]);
      setResumen(res);
      setRecientes(rec);
      setVentasPorMes(ventas);
      setDocsPorTipo(docs);
      setComparativo(comp);
      setEvolucionDiaria(evolucion);

      // Cargar pendientes NCF
      try {
        const ncf = await dashboardApi.obtenerPendientesNCF(desde, hasta);
        setPendientesNCF(ncf);
      } catch {
        // Silencioso: carga periférica
      }

      // Cargar docs no cuadrados
      try {
        const nc = await dashboardApi.obtenerDocsNoCuadrados(sucursalActiva, desde, hasta);
        setDocsNoCuadrados(nc);
      } catch {
        // Silencioso: carga periférica
      }

      // Cargar sucursales activas por separado (no bloquea el dashboard si falla)
      let sucActivas: SucursalActivaDTO[] = [];
      try {
        sucActivas = await dashboardApi.obtenerSucursalesActivas();
      } catch {
        // Silencioso: carga periférica
      }
      setSucursalesActivas(sucActivas);
      if (sucActivas.length > 0) {
        setSucursalStock((prev) => prev || sucActivas[0].codigo);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar dashboard');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, periodo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (configOpen) {
      setSelected(preferidas.length > 0
        ? preferidas
        : todasPantallas.slice(0, 6).map((p) => p.codigo)
      );
    }
  }, [configOpen, usuario?.id]);

  // ── Cargar stock negativo cuando cambia sucursal o página ─
  useEffect(() => {
    if (!sucursalStock) return;
    setLoadingStock(true);
    const salto = (paginaStock - 1) * pageSizeStock;
    dashboardApi.obtenerProductosStockNegativo(Number(sucursalStock), pageSizeStock, salto)
      .then((res) => {
        setStockNegativo(res.items);
        setTotalStock(res.total);
      })
      .catch(() => message.error('Error al cargar stock negativo'))
      .finally(() => setLoadingStock(false));
  }, [sucursalStock, paginaStock]);

  // ── Handlers ────────────────────────────────────────────
  const navegarKPI = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navegarDoc = useCallback((tipoDoc: string, noDoc?: string) => {
    if (noDoc) {
      navigate(`/${tipoDoc}/${noDoc}`);
    } else {
      navigate(`/${tipoDoc}`);
    }
  }, [navigate]);

  const handleGuardarConfig = useCallback(() => {
    if (!usuario) return;
    guardarPreferidas(usuario.id, selected);
    setConfigOpen(false);
    message.success('Accesos rápidos actualizados');
  }, [usuario, selected]);

  // ── Permisos para filtrar KPIs ──────────────────────────
  const codigosPermitidos = useMemo(() => {
    if (!usuario?.pantallas) return new Set<string>();
    return new Set(usuario.pantallas.map(p => p.codigo));
  }, [usuario]);

  // ── KPIs ────────────────────────────────────────────────
  const kpiItems = useMemo(() => [
    {
      key: 'ventas',
      codigoPantalla: 'FFAC',
      icon: <DollarOutlined />,
      color: '#34c38f',
      bg: 'rgba(52,195,143,0.1)',
      valor: resumen?.ventasDelMes ?? 0,
      label: 'Ventas del Mes',
      kind: 'currency' as const,
      path: '/FFAC',
      change: `+${resumen?.cantidadVentas ?? 0} docs`,
      changeUp: true,
      variacion: resumen?.variacionVentas,
      valorAnterior: resumen?.ventasPeriodoAnterior,
    },
    {
      key: 'compras',
      codigoPantalla: 'FRDE',
      icon: <ShoppingCartOutlined />,
      color: '#556ee6',
      bg: 'rgba(85,110,230,0.1)',
      valor: resumen?.comprasDelMes ?? 0,
      label: 'Compras del Mes',
      kind: 'currency' as const,
      path: '/FRDE',
      change: `+${resumen?.cantidadCompras ?? 0} docs`,
      changeUp: true,
      variacion: resumen?.variacionCompras,
      valorAnterior: resumen?.comprasPeriodoAnterior,
    },
    {
      key: 'pendientes',
      codigoPantalla: 'ORepostear',
      icon: <FileTextOutlined />,
      color: '#f46a6a',
      bg: 'rgba(244,106,106,0.1)',
      valor: resumen?.documentosPendientes ?? 0,
      label: 'Docs Pendientes',
      kind: 'number' as const,
      path: '/ORepostear',
      change: 'Requieren acción',
      changeUp: false,
    },
    {
      key: 'oc',
      codigoPantalla: 'FORC',
      icon: <OrderedListOutlined />,
      color: '#f0b345',
      bg: 'rgba(240,179,69,0.1)',
      valor: resumen?.ordenesCompraActivas ?? 0,
      label: 'O.C. Activas',
      kind: 'number' as const,
      path: '/FORC',
      change: 'Pendientes recibir',
      changeUp: true,
    },
    {
      key: 'clientes',
      codigoPantalla: 'MCliente',
      icon: <TeamOutlined />,
      color: '#6c5ffc',
      bg: 'rgba(108,95,252,0.1)',
      valor: resumen?.clientesActivos ?? 0,
      label: 'Clientes Activos',
      kind: 'number' as const,
      path: '/MCliente',
      change: `${companyData?.sucursales?.length ?? 0} sucursales`,
      changeUp: true,
    },
    {
      key: 'productos',
      codigoPantalla: 'MProducto',
      icon: <InboxOutlined />,
      color: '#13c2c2',
      bg: 'rgba(19,194,194,0.1)',
      valor: resumen?.productosInventario ?? 0,
      label: 'Productos',
      kind: 'number' as const,
      path: '/MProducto',
      change: 'En inventario',
      changeUp: true,
    },
  ], [resumen, companyData]);

  const kpiVisibles = useMemo(() =>
    codigosPermitidos.size === 0
      ? kpiItems  // fallback: si no hay permisos configurados, mostrar todos
      : kpiItems.filter(item => codigosPermitidos.has(item.codigoPantalla)),
    [kpiItems, codigosPermitidos]
  );

  // ── Columnas tabla recientes ────────────────────────────
  const columnasRecientes = useMemo(() => [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 160,
      render: (_: any, record: DocumentoRecienteDTO) => (
        <span
          className="paces-doc-link"
          onClick={() => navegarDoc(record.tipoDocumento, record.noDocumento)}
          style={{ fontSize: 13 }}
        >
          {record.tipoDocumento}-{record.noDocumento}
        </span>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidadNombre',
      key: 'entidadNombre',
      ellipsis: true,
      render: (val: string) => (
        <Text style={{ fontSize: 13 }}>{val || '-'}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ fontSize: 13 }}>{formatCurrency(val)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado: number) => {
        const info = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (val: string) => (
        <Text className="paces-text-secondary" style={{ fontSize: 12 }}>
          {val ? new Date(val).toLocaleDateString('es-DO') : '-'}
        </Text>
      ),
    },
  ], [navegarDoc]);

  // ── Early return vacío si no hay usuario ────────────────
  if (!usuario) {
    return <Empty description="No se pudo cargar la información del usuario" />;
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ========== HEADER ========== */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tag icon={<SyncOutlined spin={loading} />} color={loading ? 'processing' : 'default'}>
            {todayStr}
          </Tag>
        </div>
        <Space wrap>
          <Segmented
            value={periodo}
            onChange={(val) => setPeriodo(val as typeof periodo)}
            options={[
              { value: 'dia', label: 'Hoy' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
              { value: 'ano', label: 'Año' },
            ]}
          />
          <Tooltip title="Recargar datos">
            <Button
              icon={<ReloadOutlined />}
              onClick={cargarDatos}
              loading={loading}
            />
          </Tooltip>
        </Space>
      </div>

      {loading && !resumen ? (
        <div style={{ padding: '0 0 24px' }}>
          <Row gutter={[16, 16]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col xs={12} sm={8} lg={6} xl={4} key={i}>
                <div className="dashboard-kpi-card">
                  <Skeleton active paragraph={{ rows: 2 }} title={{ width: '60%' }} />
                </div>
              </Col>
            ))}
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Col xs={24} lg={8} key={i}>
                <div className="dashboard-chart-card">
                  <Skeleton active paragraph={{ rows: 6 }} title={{ width: '40%' }} />
                </div>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <>
          {/* ========== FILA 1: KPIs ========== */}
          <Row gutter={[16, 16]}>
            {kpiVisibles.map((kpi) => (
              <Col xs={12} sm={8} lg={6} xl={4} key={kpi.key}>
                <div
                  className="dashboard-kpi-card"
                  style={{ '--kpi-accent': kpi.color } as React.CSSProperties}
                  onClick={() => navegarKPI(kpi.path)}
                >
                  <div
                    className="dashboard-kpi-icon"
                    style={{ background: kpi.bg, color: kpi.color }}
                  >
                    {kpi.icon}
                  </div>
                  <div className="dashboard-kpi-value">
                    {formatKPIValue(kpi.valor, kpi.kind)}
                  </div>
                  <p className="dashboard-kpi-label">{kpi.label}</p>
                  <div
                    className="dashboard-kpi-change"
                    style={{ color: kpi.changeUp ? '#34c38f' : '#f46a6a' }}
                  >
                    {kpi.changeUp ? (
                      <RiseOutlined style={{ fontSize: 11 }} />
                    ) : (
                      <WarningOutlined style={{ fontSize: 11 }} />
                    )}
                    {' '}{kpi.change}
                  </div>
                  {'variacion' in kpi && kpi.variacion !== undefined && (
                    <div style={{
                      fontSize: 11,
                      color: kpi.variacion >= 0 ? '#34c38f' : '#f46a6a',
                      fontWeight: 500,
                      marginTop: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}>
                      {kpi.variacion >= 0 ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
                      {' '}{Math.abs(kpi.variacion).toFixed(1)}% vs período anterior
                    </div>
                  )}
                </div>
              </Col>
            ))}
          </Row>

          {/* ========== FILA 2: Gráficos ========== */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={8}>
              <div className="dashboard-chart-card">
                  <h3 className="dashboard-section-title">
                    <BarChartOutlined /> Ventas vs Compras por Mes
                  </h3>
                {ventasPorMes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={ventasPorMes} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--paces-border)" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => [formatCurrency(value), undefined]}
                      />
                      <Legend />
                      <Bar dataKey="totalVentas" name="Ventas" fill="#34c38f" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalCompras" name="Compras" fill="#f46a6a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Sin datos de ventas" style={{ padding: 40 }} />
                )}
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="dashboard-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 8px' }}>
                  <h3 className="dashboard-section-title" style={{ margin: 0 }}>
                    <BarChartOutlined /> Comparativo por Sucursales
                  </h3>
                </div>
                {comparativo.length > 0 ? (
                  <Table
                    dataSource={comparativo}
                    rowKey="sucursal"
                    pagination={false}
                    size="small"
                    className="paces-list-table"
                    showHeader={false}
                    style={{ borderTop: '1px solid var(--paces-border)' }}
                    columns={[
                      {
                        title: 'Sucursal',
                        dataIndex: 'sucursal',
                        key: 'sucursal',
                        render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text>,
                      },
                      {
                        title: 'Ventas',
                        dataIndex: 'ventas',
                        key: 'ventas',
                        align: 'right',
                        render: (v: number) => <Text style={{ color: '#34c38f', fontSize: 13, fontWeight: 600 }}>{formatCurrency(v)}</Text>,
                      },
                      {
                        title: 'Compras',
                        dataIndex: 'compras',
                        key: 'compras',
                        align: 'right',
                        render: (v: number) => <Text style={{ color: '#556ee6', fontSize: 13, fontWeight: 600 }}>{formatCurrency(v)}</Text>,
                      },
                    ]}
                  />
                ) : (
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <span className="paces-text-secondary">Sin datos del período</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="dashboard-chart-card">
                  <h3 className="dashboard-section-title">
                    <LineChartOutlined /> Evolución Diaria
                  </h3>
                {evolucionDiaria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolucionDiaria} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--paces-border)" />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val: string) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        labelFormatter={(val: string) => new Date(val).toLocaleDateString('es-DO')}
                        formatter={(value: number) => [formatCurrency(value), undefined]}
                      />
                      <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#34c38f" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <span className="paces-text-secondary">Sin datos del período</span>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* ========== FILA 3: NCF Pendientes ========== */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <div className="dashboard-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--paces-border)' }}>
                  <h3 className="dashboard-section-title" style={{ margin: 0 }}>
                    <FileTextOutlined /> NCF Pendientes por Enviar
                  </h3>
                  <span style={{ fontSize: 13, color: pendientesNCF.length > 0 ? '#f46a6a' : '#34c38f', fontWeight: 600 }}>
                    {pendientesNCF.length > 0 ? `${pendientesNCF.length} pendiente(s)` : <><CheckCircleOutlined /> Al día</>}
                  </span>
                </div>
                {pendientesNCF.length > 0 ? (
                  <Table
                    dataSource={pendientesNCF}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="paces-list-table"
                    columns={[
                      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => <Text style={{ fontSize: 12 }}>{v?.split('T')[0]}</Text> },
                      { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150, render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
                      { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 12 }}>{v ? v.toLowerCase().split(' ').map((s:string) => s.charAt(0).toUpperCase()+s.slice(1)).join(' ') : '-'}</Text> },
                      { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 140, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v || '-'}</Text> },
                      { title: 'Mensaje DGII', dataIndex: 'respuestaDGII', key: 'respuestaDGII', ellipsis: true, render: (v: string) => v ? <Text style={{ color: '#f46a6a', fontSize: 12 }}>{v}</Text> : <Text className="paces-text-placeholder" style={{ fontSize: 12 }}>-</Text> },
                      { title: 'Sucursal', dataIndex: 'sucursalNombre', key: 'sucursalNombre', width: 120, render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
                    ]}
                    style={{ borderTop: '1px solid var(--paces-border)' }}
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <span className="paces-text-secondary"><CheckCircleOutlined /> No hay NCF pendientes por enviar en este período</span>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* ========== FILA 4B: Docs No Cuadrados ========== */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <div className="dashboard-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--paces-border)' }}>
                  <h3 className="dashboard-section-title" style={{ margin: 0 }}>
                    <WarningOutlined /> Documentos No Cuadrados
                  </h3>
                  <span style={{ fontSize: 13, color: docsNoCuadrados.length > 0 ? '#f46a6a' : '#34c38f', fontWeight: 600 }}>
                    {docsNoCuadrados.length > 0 ? `${docsNoCuadrados.length} documento(s)` : <><CheckCircleOutlined /> Al día</>}
                  </span>
                </div>
                {docsNoCuadrados.length > 0 ? (
                  <Table
                    dataSource={docsNoCuadrados}
                    rowKey="id"
                    pagination={{ pageSize: 5, showSizeChanger: false }}
                    size="small"
                    className="paces-list-table"
                    columns={[
                      { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 110, render: (v: string) => <Text style={{ fontSize: 12 }}>{v?.split('T')[0]}</Text> },
                      { title: 'Documento', dataIndex: 'noDocumento', key: 'noDocumento', width: 150, render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
                      { title: 'Entidad', dataIndex: 'nombreEntidad', key: 'nombreEntidad', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 12 }}>{v || '-'}</Text> },
                      { title: 'Débitos', dataIndex: 'debitos', key: 'debitos', width: 130, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 12 }}>{formatNumber(v)}</Text> },
                      { title: 'Créditos', dataIndex: 'creditos', key: 'creditos', width: 130, align: 'right' as const, render: (v: number) => <Text style={{ fontSize: 12 }}>{formatNumber(v)}</Text> },
                      { title: 'Diferencia', key: 'diferencia', width: 130, align: 'right' as const, render: (_: any, r: any) => {
                        const diff = (r.debitos || 0) - (r.creditos || 0);
                        return <Text style={{ color: '#f46a6a', fontWeight: 600, fontSize: 12 }}>{formatNumber(diff)}</Text>;
                      }},
                    ]}
                    style={{ borderTop: '1px solid var(--paces-border)' }}
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <span className="paces-text-secondary"><CheckCircleOutlined /> No hay documentos no cuadrados en este período</span>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {/* ========== FILA 5: Recientes ========== */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24}>
              <div className="dashboard-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 0' }}>
                  <h3 className="dashboard-section-title">
                    <FileTextOutlined /> Últimos Documentos
                  </h3>
                </div>
                {recientes.length > 0 ? (
                  <Table
                    dataSource={recientes}
                    columns={columnasRecientes}
                    rowKey={(r) => `${r.tipoDocumento}-${r.noDocumento}`}
                    pagination={false}
                    size="middle"
                    className="paces-list-table"
                    style={{ borderTop: `1px solid var(--paces-border)` }}
                  />
                ) : (
                  <Empty description="Sin documentos recientes" style={{ padding: 40 }} />
                )}
              </div>
            </Col>
          </Row>

          {/* ========== FILA 5: Stock Negativo ========== */}
          {sucursalesActivas.length > 0 && (
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <div className="dashboard-chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--paces-border)' }}>
                    <h3 className="dashboard-section-title" style={{ margin: 0 }}>
                      <InboxOutlined /> Productos con Stock Negativo
                    </h3>
                    <Select
                      value={sucursalStock}
                      onChange={(val) => {
                        setSucursalStock(val);
                        setPaginaStock(1);
                      }}
                      style={{ width: 220 }}
                      options={sucursalesActivas.map(s => ({
                        value: s.codigo,
                        label: s.nombre,
                      }))}
                      loading={loadingStock}
                    />
                  </div>
                  {stockNegativo.length > 0 || loadingStock ? (
                    <Table
                      dataSource={stockNegativo}
                      rowKey={(r) => `${r.codigo}-${r.almacen}`}
                      pagination={{
                        current: paginaStock,
                        pageSize: pageSizeStock,
                        total: totalStock,
                        onChange: (page) => setPaginaStock(page),
                        showSizeChanger: false,
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                      }}
                      size="small"
                      className="paces-list-table"
                      loading={loadingStock}
                      columns={[
                        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Producto', dataIndex: 'nombre', key: 'nombre', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 13 }}>{v || '-'}</Text> },
                        { title: 'Existencia', dataIndex: 'existencia', key: 'existencia', width: 110, align: 'right',
                          render: (v: number) => <Text style={{ color: '#f46a6a', fontWeight: 600, fontSize: 13 }}>{v.toLocaleString('es-DO')}</Text> },
                        { title: 'Costo', dataIndex: 'ultimoCosto', key: 'ultimoCosto', width: 160, align: 'right',
                          render: (v: number | null) => <Text style={{ fontSize: 13 }}>{v != null ? formatNumber(v) : '-'}</Text> },
                        { title: 'Almacén', dataIndex: 'almacen', key: 'almacen', width: 180, render: (v: string) => <Text style={{ fontSize: 13 }}>{v?.trim() || '-'}</Text> },
                      ]}
                      style={{ borderTop: '1px solid var(--paces-border)' }}
                    />
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <span className="paces-text-secondary"><CheckCircleOutlined /> No hay productos con stock negativo en esta sucursal</span>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          )}

          {/* ========== FILA 4: Info Usuario + Accesos Rápidos ========== */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <div className="paces-card">
                <div className="paces-card-header">
                  <span><UserOutlined /> Información del Usuario</span>
                </div>
                <div className="paces-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <EntidadImagen
                      tipo="USUARIO"
                      entidadID={usuario?.id ?? 0}
                      fallback={usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      size={48}
                    />
                    <div>
                      <Text style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>
                        {usuario?.nombre || '-'}
                      </Text>
                      <Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                        @{usuario?.nombreUsuario}
                      </Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Row gutter={[16, 12]}>
                      <Col span={12}>
                        <Text strong className="paces-text-secondary" style={{ fontSize: 12, display: 'block' }}>
                          Nombre:
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombre || '-'}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong className="paces-text-secondary" style={{ fontSize: 12, display: 'block' }}>
                          Usuario:
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nombreUsuario || '-'}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong className="paces-text-secondary" style={{ fontSize: 12, display: 'block' }}>
                          Empleado:
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.empleado || '-'}</Text>
                      </Col>

                    </Row>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="paces-card">
                <div className="paces-card-header">
                  <span><RocketOutlined /> Accesos Rápidos</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="paces-text-secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                      {pantallasVisibles.length} de {todasPantallas.length}
                    </span>
                    <Tooltip title="Configurar accesos rápidos">
                      <Button
                        type="text"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setConfigOpen(true)}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className="paces-card-body">
                  {pantallasVisibles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Text className="paces-text-secondary">No hay accesos configurados</Text>
                      <br />
                      <Button type="link" size="small" onClick={() => setConfigOpen(true)}>
                        Configurar ahora
                      </Button>
                    </div>
                  ) : (
                    <Row gutter={[10, 10]}>
                      {pantallasVisibles.map((p) => (
                        <Col span={12} key={p.codigo}>
                          <div
                            className="paces-quick-item"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/${p.codigo}`)}
                          >
                            {p.nombre}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </>
      )}

      {/* ========== MODAL config accesos rápidos ========== */}
      <Modal
        title="Configurar Accesos Rápidos"
        open={configOpen}
        onCancel={() => setConfigOpen(false)}
        onOk={handleGuardarConfig}
        okText="Guardar"
        width={480}
      >
        <Text className="paces-text-secondary" style={{ display: 'block', marginBottom: 12 }}>
          Selecciona las pantallas que quieres mostrar en Accesos Rápidos del dashboard:
        </Text>
        <Input
          placeholder="Buscar pantalla..."
          allowClear
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ marginBottom: 12 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          {todasPantallas
            .filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map((p) => {
              const checked = selected.includes(p.codigo);
              return (
                <div
                  key={p.codigo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                  className="paces-row-hover"
                  onClick={() => {
                    if (checked) {
                      setSelected((prev) => prev.filter((c) => c !== p.codigo));
                    } else {
                      setSelected((prev) => [...prev, p.codigo]);
                    }
                  }}
                >
                  <Checkbox checked={checked} style={{ pointerEvents: 'none' }} />
                  <span style={{ marginLeft: 8, userSelect: 'none' }}>{p.nombre}</span>
                </div>
              );
            })}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
