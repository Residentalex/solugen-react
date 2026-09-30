import React, { useEffect } from 'react';
import { Card, Tag, Button, Row, Col, Space, message, Alert, Grid, Tooltip, Divider } from 'antd';
import {
  KeyOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  IdcardOutlined,
  ReloadOutlined,
  BankOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { authApi } from '../../api/authApi';
import EntidadImagen from '../../components/EntidadImagen';
import { extraerMensajeError } from '../../utils/formats';

const { useBreakpoint } = Grid;

const MiPerfil: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const equipo = useAuthStore((s) => s.equipo);
  const ip = useAuthStore((s) => s.ip);
  const compania = useAuthStore((s) => s.compania);

  useEffect(() => {
    setActiveModule('MPerfil');
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar]);

  const [recargando, setRecargando] = React.useState(false);
  const [loadingError, setLoadingError] = React.useState(false);

  const screens = useBreakpoint();
  const isLarge = screens.xxl === true;

  const handleRefresh = () => {
    setLoadingError(false);
    handleRecargarPermisos();
  };

  const handleRecargarPermisos = async () => {
    if (recargando) return;
    setRecargando(true);
    try {
      const sesion = await authApi.refresh({ refreshToken, equipo, ip, sucursal: compania });
      setSession({
        accessToken: sesion.accessToken,
        refreshToken: sesion.refreshToken,
        usuario: sesion.usuario,
        sucursalActiva: sesion.sucursalActiva,
        sucursalContable: sesion.sucursalContable,
        sucursalesPermitidas: sesion.sucursalesPermitidas,
      });
      message.success('Permisos recargados correctamente');
    } catch (err: unknown) {
      message.error(extraerMensajeError(err, 'Error al recargar permisos'));
      setLoadingError(true);
    } finally {
      setRecargando(false);
    }
  };

  if (!usuario) {
    return null;
  }

  const inicial = usuario.nombre?.charAt(0)?.toUpperCase() || 'U';
  const pantallasUnicas = new Set(usuario.pantallas?.map((p) => p.codigo)).size;
  const vigenciaBaja = usuario.diasVigencia > 0 && usuario.diasVigencia <= 15;

  const sucursalActivaNombre =
    usuario.sucursalesRoles?.find((sr) => sr.sucursal === sucursalActiva)?.nombreSucursal
    || sucursalesPermitidas?.find((sp) => sp.sucursal === sucursalActiva)?.nombre
    || '—';

  // ===== Datos personales =====
  const datosPersonalesItems = [
    { label: 'Nombre completo', value: usuario.nombre || '-', icon: <IdcardOutlined /> },
    { label: 'Usuario', value: usuario.nombreUsuario, icon: <UserOutlined /> },
    { label: 'Empleado', value: usuario.empleado || '-', icon: <TeamOutlined /> },
    { label: 'ID Empleado', value: usuario.empleadoID || '-', icon: <IdcardOutlined /> },
  ];

  // ===== Acceso =====
  const accesoItems = [
    { label: 'Sucursal activa', value: sucursalActivaNombre, icon: <BankOutlined /> },
    {
      label: 'Vigencia de clave',
      value: usuario.diasVigencia > 0 ? `${usuario.diasVigencia} días` : 'Ilimitada',
      icon: <CalendarOutlined />,
      warning: vigenciaBaja,
    },
    { label: 'Estado de cuenta', value: usuario.activo ? 'Activo' : 'Inactivo', icon: <CheckCircleOutlined /> },
  ];

  // ===== Seguridad =====
  const seguridadItems = [
    { label: 'Roles asignados', value: usuario.roles?.length || 0, icon: <SafetyOutlined />, type: 'count' },
    { label: 'Pantallas accesibles', value: pantallasUnicas, icon: <AppstoreOutlined />, type: 'count' },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar perfil"
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

      {/* ===== Identity Card ===== */}
      <Card className="paces-card-erp" style={{ borderRadius: 10, marginBottom: 24 }}>
        {/* Responsive header: stacks on mobile, horizontal on desktop */}
        <div style={{
          display: 'flex',
          flexDirection: isLarge ? 'row' : 'column',
          alignItems: 'center',
          gap: isLarge ? 18 : 16,
        }}>
          {/* Avatar */}
          <EntidadImagen
            tipo="USUARIO"
            entidadID={usuario?.id ?? 0}
            fallback={inicial}
            size={isLarge ? 46 : 56}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />

          {/* Identity info */}
          <div style={{ flex: 1, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, fontSize: isLarge ? 16 : 18, color: 'var(--paces-text-heading)' }}>
              {usuario.nombre || 'Sin nombre'}
            </div>
            <div style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>
              @{usuario.nombreUsuario}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color={usuario.activo ? 'green' : 'red'} style={{ borderRadius: 5, padding: '0 7px', margin: 0, fontSize: 11, lineHeight: '20px' }}>
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>
          </div>

          {/* Acciones principales con texto siempre visible */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={recargando}
              disabled={recargando}
              onClick={handleRecargarPermisos}
              title="Recargar permisos"
              style={{ borderRadius: 6 }}
            >
              Recargar permisos
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<KeyOutlined />}
              onClick={() => navigate('/cambiar-clave')}
              disabled={recargando}
              title="Cambiar clave"
              style={{ borderRadius: 6 }}
            >
              Cambiar clave
            </Button>
          </div>
        </div>
      </Card>

      {/* ===== Stat Cards ===== */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <div className="paces-stat-card paces-stat-card--primary">
            <div className="paces-stat-card-body">
              <div className="paces-stat-icon" style={{ background: 'rgba(85,110,230,0.12)' }}>
                <SafetyOutlined style={{ color: 'var(--paces-primary)', fontSize: 24 }} />
              </div>
              <div className="paces-stat-card-content">
                <div className="paces-stat-value">{usuario.roles?.length || 0}</div>
                <div className="paces-stat-label">Roles</div>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="paces-stat-card paces-stat-card--success">
            <div className="paces-stat-card-body">
              <div className="paces-stat-icon" style={{ background: 'rgba(52,195,143,0.12)' }}>
                <AppstoreOutlined style={{ color: '#34c38f', fontSize: 24 }} />
              </div>
              <div className="paces-stat-card-content">
                <div className="paces-stat-value">{pantallasUnicas}</div>
                <div className="paces-stat-label">Pantallas</div>
              </div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className={`paces-stat-card ${vigenciaBaja ? 'paces-stat-card--warning' : 'paces-stat-card--success'}`}>
            <div className="paces-stat-card-body">
              <div className="paces-stat-icon" style={{ background: vigenciaBaja ? 'rgba(240,179,69,0.12)' : 'rgba(52,195,143,0.12)' }}>
                <CalendarOutlined style={{ color: vigenciaBaja ? '#f0b345' : '#34c38f', fontSize: 24 }} />
              </div>
              <div className="paces-stat-card-content">
                <div className="paces-stat-value">{usuario.diasVigencia > 0 ? `${usuario.diasVigencia}d` : '∞'}</div>
                <div className="paces-stat-label">Vigencia de clave</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ===== Three-column layout: Datos Personales | Acceso | Seguridad ===== */}
      <Row gutter={[24, 24]}>
        {/* Datos Personales */}
        <Col xs={24} lg={8}>
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserOutlined style={{ color: 'var(--paces-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Datos Personales</span>
              </div>
            }
          >
            <div style={{ padding: '20px 24px' }}>
              {datosPersonalesItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: idx < datosPersonalesItems.length - 1 ? '1px solid var(--paces-border-secondary)' : 'none',
                  }}
                >
                  <Space size={6}>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.icon}</span>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.label}</span>
                  </Space>
                  <span style={{ color: 'var(--paces-text)', fontWeight: 500, fontSize: 13, textAlign: 'right' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Acceso */}
        <Col xs={24} lg={8}>
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LockOutlined style={{ color: 'var(--paces-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Acceso</span>
              </div>
            }
          >
            <div style={{ padding: '20px 24px' }}>
              {accesoItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: idx < accesoItems.length - 1 ? '1px solid var(--paces-border-secondary)' : 'none',
                  }}
                >
                  <Space size={6}>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.icon}</span>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.label}</span>
                  </Space>
                  {item.warning ? (
                    <Tag color="orange" style={{ borderRadius: 5, padding: '0 7px', margin: 0, fontSize: 11 }}>
                      {item.value}
                    </Tag>
                  ) : (
                    <span style={{ color: 'var(--paces-text)', fontWeight: 500, fontSize: 13, textAlign: 'right' }}>
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={6}>
                  <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}><ReloadOutlined /></span>
                  <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>Recargar permisos</span>
                </Space>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={recargando}
                  disabled={recargando}
                  onClick={handleRecargarPermisos}
                  title="Recargar permisos"
                  style={{ borderRadius: 6 }}
                >
                  Recargar permisos
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* Seguridad */}
        <Col xs={24} lg={8}>
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 12, height: '100%', borderColor: 'var(--paces-primary)' }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyOutlined style={{ color: 'var(--paces-primary)', fontSize: 16 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Seguridad</span>
                {vigenciaBaja && (
                  <Tag color="orange" style={{ marginLeft: 'auto', borderRadius: 5, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
                    Atención
                  </Tag>
                )}
              </div>
            }
          >
            <div style={{ padding: '20px 24px' }}>
              {seguridadItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: idx < seguridadItems.length - 1 ? '1px solid var(--paces-border-secondary)' : 'none',
                  }}
                >
                  <Space size={6}>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.icon}</span>
                    <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>{item.label}</span>
                  </Space>
                  <span style={{ color: 'var(--paces-text)', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>
                    {item.type === 'count' ? item.value : item.value}
                  </span>
                </div>
              ))}
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Tooltip title="Cambiar tu contraseña actual">
                  <Button
                    type="primary"
                    icon={<KeyOutlined />}
                    onClick={() => navigate('/cambiar-clave')}
                    style={{ borderRadius: 8, width: '100%' }}
                  >
                    Cambiar Clave
                  </Button>
                </Tooltip>
                <Tooltip title="Ver y gestionar tus roles y permisos">
                  <Button
                    icon={<SafetyOutlined />}
                    onClick={() => navigate('/MROL')}
                    style={{ borderRadius: 8, width: '100%' }}
                  >
                    Ver Roles y Permisos
                  </Button>
                </Tooltip>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MiPerfil;