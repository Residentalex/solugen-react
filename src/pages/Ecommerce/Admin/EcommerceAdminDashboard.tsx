import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Statistic, Button, Typography, message, Table, Tag,
  Progress, Spin, Badge, Segmented, Tooltip, theme, Space, Empty, Input
} from 'antd';
import {
  ShoppingOutlined, OrderedListOutlined, TagsOutlined, PictureOutlined,
  SyncOutlined, SettingOutlined, ArrowRightOutlined, DollarOutlined,
  RiseOutlined, FallOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, RightCircleOutlined,
  SearchOutlined, ReloadOutlined, CreditCardOutlined, TeamOutlined,
  RocketOutlined, AppstoreOutlined, InboxOutlined, StarOutlined,
  BellOutlined, ExclamationCircleOutlined, FileTextOutlined,
  WalletOutlined, ShopOutlined
} from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type {
  AdminDashboardResumenDTO,
  AdminOrdenListadoDTO,
  AdminOrdenesPaginadoDTO
} from '../../../api/ecommerceApi';

const { Text, Title } = Typography;
const { useToken } = theme;

type PeriodFilter = 'dia' | 'semana' | 'mes' | 'ano';

const ESTADO_TAG: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDIENTE: { color: 'warning', icon: <ClockCircleOutlined /> },
  PROCESANDO: { color: 'processing', icon: <SyncOutlined spin /> },
  ENVIADO: { color: 'cyan', icon: <RocketOutlined /> },
  COMPLETADO: { color: 'success', icon: <CheckCircleOutlined /> },
  CANCELADO: { color: 'error', icon: <CloseCircleOutlined /> },
};

const KPI_ICONS: Record<string, React.ReactNode> = {
  catalogo: <ShopOutlined style={{ fontSize: 22 }} />,
  pendientes: <ClockCircleOutlined style={{ fontSize: 22 }} />,
  categorias: <AppstoreOutlined style={{ fontSize: 22 }} />,
  banners: <PictureOutlined style={{ fontSize: 22 }} />,
};

const KPI_COLORS: Record<string, string> = {
  catalogo: '#556ee6',
  pendientes: '#f46a6a',
  categorias: '#34c38f',
  banners: '#f1b44c',
};

const EcommerceAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useToken();
  const [resumen, setResumen] = useState<AdminDashboardResumenDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [ordenes, setOrdenes] = useState<AdminOrdenListadoDTO[]>([]);
  const [ordenesLoading, setOrdenesLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [periodo, setPeriodo] = useState<PeriodFilter>('mes');

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [res, ord] = await Promise.all([
        ecommerceApi.adminObtenerResumen(),
        ecommerceApi.adminObtenerOrdenes({ pagina: 1, tamano: 10 }),
      ]);
      setResumen(res);
      setOrdenes(ord.items || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSincronizar = async () => {
    setSyncing(true);
    try {
      await ecommerceApi.adminSincronizar();
      message.success('¡Sincronización completada exitosamente!');
      cargarDatos();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  // ── Filtrado de órdenes ──
  const ordenesFiltradas = useMemo(() => {
    if (!busqueda) return ordenes;
    const q = busqueda.toLowerCase();
    return ordenes.filter(
      (o) =>
        o.nombreCliente?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q) ||
        String(o.noOrden).includes(q) ||
        o.estado?.toLowerCase().includes(q)
    );
  }, [ordenes, busqueda]);

  // ── Órdenes por estado ──
  const ordenesPorEstado = useMemo(() => {
    const estados: Record<string, number> = {};
    for (const o of ordenes) {
      estados[o.estado] = (estados[o.estado] || 0) + 1;
    }
    // Calcular total de ingresos de órdenes completadas
    const totalIngresos = ordenes
      .filter((o) => o.estado === 'COMPLETADO')
      .reduce((sum, o) => sum + o.total, 0);
    return { estados, totalIngresos };
  }, [ordenes]);

  // ── KPIs ──
  const kpis = useMemo(() => [
    {
      key: 'catalogo',
      titulo: 'Productos en Catálogo',
      valor: resumen?.totalProductosCatalogo ?? 0,
      path: '/EProductos',
      tendencia: '+12%',
      tendenciaUp: true,
    },
    {
      key: 'pendientes',
      titulo: 'Órdenes Pendientes',
      valor: resumen?.totalOrdenesPendientes ?? 0,
      path: '/EOrdenes',
      tendencia: resumen?.totalOrdenesPendientes
        ? `+${resumen.totalOrdenesPendientes} hoy`
        : 'Sin cambios',
      tendenciaUp: (resumen?.totalOrdenesPendientes ?? 0) > 0,
    },
    {
      key: 'categorias',
      titulo: 'Categorías',
      valor: resumen?.totalCategorias ?? 0,
      path: '/ECategorias',
      tendencia: `${(resumen?.totalCategorias ?? 0) > 0 ? 'Activas' : 'Sin datos'}`,
      tendenciaUp: true,
    },
    {
      key: 'banners',
      titulo: 'Banners Activos',
      valor: resumen?.totalBannersActivos ?? 0,
      path: '/EBanners',
      tendencia: `${(resumen?.totalBannersActivos ?? 0) > 0 ? 'Publicando' : 'Sin campaña'}`,
      tendenciaUp: (resumen?.totalBannersActivos ?? 0) > 0,
    },
  ], [resumen]);

  // ── Columnas de la tabla ──
  const columns = [
    {
      title: 'No. Orden',
      dataIndex: 'noOrden',
      key: 'noOrden',
      width: 110,
      sorter: (a: AdminOrdenListadoDTO, b: AdminOrdenListadoDTO) => a.noOrden - b.noOrden,
      render: (val: number) => <Text strong style={{ color: token.colorPrimary }}>#{String(val).padStart(6, '0')}</Text>,
    },
    {
      title: 'Cliente',
      dataIndex: 'nombreCliente',
      key: 'nombreCliente',
      ellipsis: true,
      sorter: (a: AdminOrdenListadoDTO, b: AdminOrdenListadoDTO) => a.nombreCliente.localeCompare(b.nombreCliente),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      responsive: ['lg' as const],
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      sorter: (a: AdminOrdenListadoDTO, b: AdminOrdenListadoDTO) => a.total - b.total,
      render: (val: number) => (
        <Text strong style={{ color: token.colorText }}>RD$ {val.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 150,
      filters: Object.keys(ESTADO_TAG).map((k) => ({ text: k, value: k })),
      onFilter: (value: any, record: AdminOrdenListadoDTO) => record.estado === value,
      render: (estado: string) => {
        const cfg = ESTADO_TAG[estado] || { color: 'default', icon: <RightCircleOutlined /> };
        return <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 12, padding: '2px 12px' }}>{estado}</Tag>;
      },
    },
  ];

  const totalIngresos = ordenesPorEstado.totalIngresos;
  const totalOrdenes = ordenes.length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* ═══ Encabezado ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Dashboard Ecommerce
          </Title>
          <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
            Panel de control y monitoreo de tu tienda online
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<SettingOutlined />}
            onClick={() => navigate('/EConfig')}
            style={{ borderRadius: 10 }}
          >
            Configuración
          </Button>
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSincronizar}
            style={{ borderRadius: 10, boxShadow: token.boxShadow }}
          >
            Sincronizar Productos
          </Button>
        </Space>
      </div>

      {/* ═══ FILA 1: KPIs principales ═══ */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {kpis.map((kpi) => (
          <Col xs={24} sm={12} lg={6} key={kpi.key}>
            <Card
              hoverable
              style={{
                borderRadius: 18,
                border: 'none',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                background: token.colorBgContainer,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                height: '100%',
              }}
              styles={{ body: { padding: 24 } }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
              }}
              onClick={() => navigate(kpi.path)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                    {kpi.titulo}
                  </Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: token.colorTextHeading, marginTop: 8, lineHeight: 1.1 }}>
                    {kpi.valor}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    {kpi.tendenciaUp
                      ? <RiseOutlined style={{ color: '#34c38f', fontSize: 12 }} />
                      : <FallOutlined style={{ color: '#f46a6a', fontSize: 12 }} />
                    }
                    <Text style={{ fontSize: 12, color: kpi.tendenciaUp ? '#34c38f' : '#f46a6a', fontWeight: 500 }}>
                      {kpi.tendencia}
                    </Text>
                  </div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${KPI_COLORS[kpi.key]}12`,
                  color: KPI_COLORS[kpi.key],
                  flexShrink: 0,
                }}>
                  {KPI_ICONS[kpi.key]}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ═══ FILA 2: Órdenes + Ingresos ═══ */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {/* Panel principal: Distribución de órdenes */}
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 18,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              height: '100%',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                  Resumen de Órdenes
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Distribución y métricas principales
                </Text>
              </div>
              <Segmented
                value={periodo}
                onChange={(val) => setPeriodo(val as PeriodFilter)}
                options={[
                  { value: 'dia' as PeriodFilter, label: 'Día' },
                  { value: 'semana' as PeriodFilter, label: 'Semana' },
                  { value: 'mes' as PeriodFilter, label: 'Mes' },
                  { value: 'ano' as PeriodFilter, label: 'Año' },
                ]}
                style={{ borderRadius: 10, fontSize: 12 }}
              />
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: token.colorTextHeading }}>
                    {totalOrdenes}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total Órdenes</Text>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#34c38f' }}>
                    {(resumen?.totalProductosCatalogo ?? 0) > 0 ? 'Activo' : 'Inactivo'}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Estado Tienda</Text>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#f1b44c' }}>
                    {resumen?.totalBannersActivos ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Campañas Activas</Text>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <Text strong style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
                Estado de las Órdenes
              </Text>
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {Object.entries(ordenesPorEstado.estados).length > 0 ? (
                  Object.entries(ordenesPorEstado.estados).map(([estado, count]) => {
                    const cfg = ESTADO_TAG[estado] || { color: 'default', icon: <RightCircleOutlined /> };
                    const pct = totalOrdenes > 0 ? Math.round((count / totalOrdenes) * 100) : 0;
                    const barColor =
                      estado === 'COMPLETADO' ? '#34c38f' :
                      estado === 'CANCELADO' ? '#f46a6a' :
                      estado === 'PROCESANDO' ? '#556ee6' :
                      estado === 'ENVIADO' ? '#50a5f1' :
                      '#f1b44c';
                    return (
                      <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Tag color={cfg.color} style={{ width: 120, borderRadius: 10, textAlign: 'center', margin: 0 }}>
                          {estado}
                        </Tag>
                        <Progress
                          percent={pct}
                          strokeColor={barColor}
                          trailColor="var(--paces-border)"
                          showInfo={false}
                          style={{ flex: 1, margin: 0 }}
                          size="small"
                        />
                        <Text strong style={{ width: 40, textAlign: 'right', fontSize: 13 }}>{count}</Text>
                      </div>
                    );
                  })
                ) : (
                  <Empty description="Sin órdenes registradas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Space>
            </div>
          </Card>
        </Col>

        {/* Panel secundario: Métricas rápidas */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: 18,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              height: '100%',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Title level={5} style={{ margin: '0 0 20px 0', fontWeight: 600 }}>Métricas Rápidas</Title>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${token.colorPrimary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorPrimary }}>
                  <ShoppingOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Productos</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: token.colorTextHeading }}>{resumen?.totalProductosCatalogo ?? 0}</div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#34c38f18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34c38f' }}>
                  <CheckCircleOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Meta del Mes</Text>
                  <Progress percent={totalOrdenes > 0 ? Math.min(100, Math.round((ordenes.filter(o => o.estado === 'COMPLETADO').length / Math.max(totalOrdenes, 1)) * 100)) : 0} size="small" style={{ margin: '4px 0 0' }} />
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1b44c18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f1b44c' }}>
                  <TagsOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Categorías</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: token.colorTextHeading }}>{resumen?.totalCategorias ?? 0}</div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f46a6a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f46a6a' }}>
                  <BellOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pendientes</Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: token.colorTextHeading }}>{resumen?.totalOrdenesPendientes ?? 0}</div>
                </div>
              </div>
            </Space>

            {totalIngresos > 0 && (
              <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, var(--paces-primary) 0%, var(--paces-primary-hover) 100%)', textAlign: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos Completados</Text>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                  RD$ {totalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ═══ FILA 3: Tabla de Órdenes Recientes ═══ */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          <Card
            style={{
              borderRadius: 18,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0, fontWeight: 600 }}>Últimas Transacciones</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Órdenes recientes del ecommerce</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input.Search
                  placeholder="Buscar orden..."
                  allowClear
                  onSearch={(val) => setBusqueda(val)}
                  style={{ width: 280, borderRadius: 10 }}
                  prefix={<SearchOutlined style={{ color: 'var(--paces-text-secondary)' }} />}
                />
                <Tooltip title="Recargar">
                  <Button icon={<ReloadOutlined />} onClick={cargarDatos} style={{ borderRadius: 10 }} />
                </Tooltip>
                <Button type="link" onClick={() => navigate('/EOrdenes')} style={{ borderRadius: 10 }}>
                  Ver todas <ArrowRightOutlined />
                </Button>
              </div>
            </div>
            <Table
              dataSource={ordenesFiltradas}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={false}
              style={{ marginTop: 8 }}
              className="paces-list-table"
              locale={{ emptyText: <Empty description="No hay órdenes registradas" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              onRow={(record) => ({
                onClick: () => navigate(`/EOrdenes`),
                style: { cursor: 'pointer' },
              })}
            />
            {ordenes.length > 10 && (
              <div style={{ padding: '12px 24px', textAlign: 'right', borderTop: '1px solid var(--paces-border)' }}>
                <Button type="text" onClick={() => navigate('/EOrdenes')}>
                  Ver todas las órdenes <ArrowRightOutlined />
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ═══ FILA 4: Accesos Rápidos ═══ */}
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card
            style={{
              borderRadius: 18,
              border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: 24 } }}
          >
            <Title level={5} style={{ margin: '0 0 20px 0', fontWeight: 600 }}>Accesos Rápidos</Title>
            <Row gutter={[12, 12]}>
              {[
                { icon: <ShoppingOutlined />, label: 'Gestionar Productos', path: '/EProductos', color: '#556ee6' },
                { icon: <OrderedListOutlined />, label: 'Ver Órdenes', path: '/EOrdenes', color: '#34c38f' },
                { icon: <TagsOutlined />, label: 'Gestionar Categorías', path: '/ECategorias', color: '#f1b44c' },
                { icon: <PictureOutlined />, label: 'Gestionar Banners', path: '/EBanners', color: '#f46a6a' },
                { icon: <SettingOutlined />, label: 'Configuración', path: '/EConfig', color: token.colorPrimary },
              ].map((item, idx) => (
                <Col xs={24} sm={12} md={8} lg={4} key={idx}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 14,
                      border: 'none',
                      background: 'var(--paces-hover-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                    styles={{ body: { padding: '16px 12px' } }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    <div style={{ fontSize: 24, color: item.color, marginBottom: 8 }}>{item.icon}</div>
                    <Text style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>{item.label}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EcommerceAdminDashboard;
