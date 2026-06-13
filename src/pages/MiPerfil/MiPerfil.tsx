import React, { useEffect } from 'react';
import { Card, Tag, Button, Typography, Row, Col, Space, message, Alert } from 'antd';
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
  RightCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { authApi } from '../../api/authApi';
import EntidadImagen from '../../components/EntidadImagen';

const { Text, Title } = Typography;

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

  const handleRefresh = () => {
    setLoadingError(false);
    handleRecargarPermisos();
  };

  const handleRecargarPermisos = async () => {
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
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al recargar permisos');
      setLoadingError(true);
    } finally {
      setRecargando(false);
    }
  };

  if (!usuario) return null;

  const inicial = usuario.nombre?.charAt(0)?.toUpperCase() || 'U';
  const pantallasUnicas = new Set(usuario.pantallas?.map((p) => p.codigo)).size;
  const vigenciaBaja = usuario.diasVigencia > 0 && usuario.diasVigencia <= 15;

  const sucursalActivaNombre =
    usuario.sucursalesRoles?.find((sr) => sr.sucursal === sucursalActiva)?.nombreSucursal
    || sucursalesPermitidas?.find((sp) => sp.sucursal === sucursalActiva)?.nombre
    || '—';

  const infoItems = [
    { label: 'Nombre', value: usuario.nombre || '-', icon: <IdcardOutlined /> },
    { label: 'Usuario', value: usuario.nombreUsuario, icon: <UserOutlined /> },
    { label: 'Empleado', value: usuario.empleado || '-', icon: <TeamOutlined /> },
    { label: 'ID Empleado', value: usuario.empleadoID || '-', icon: <IdcardOutlined /> },
    { label: 'Sucursal activa', value: sucursalActivaNombre, icon: <BankOutlined /> },
    {
      label: 'Vigencia de clave',
      value: usuario.diasVigencia > 0 ? `${usuario.diasVigencia} días` : 'Ilimitada',
      icon: <CalendarOutlined />,
    },
    {
      label: 'Estado',
      value: usuario.activo ? 'Activo' : 'Inactivo',
      icon: <CheckCircleOutlined />,
      valueNode: (
        <Tag color={usuario.activo ? 'green' : 'red'} style={{ borderRadius: 6, margin: 0 }}>
          {usuario.activo ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
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
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <EntidadImagen
            tipo="USUARIO"
            entidadID={usuario?.id ?? 0}
            fallback={inicial}
            size={46}
            style={{ borderRadius: 10 }}
          />
          <div style={{ flex: 1, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--paces-text-heading)' }}>
              {usuario.nombre || 'Sin nombre'}
            </div>
            <div style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>
              @{usuario.nombreUsuario} · <Tag color={usuario.activo ? 'green' : 'red'} style={{ borderRadius: 5, padding: '0 7px', margin: 0, fontSize: 11, lineHeight: '20px' }}>{usuario.activo ? 'Activo' : 'Inactivo'}</Tag>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button size="small" icon={<ReloadOutlined />} loading={recargando} onClick={handleRecargarPermisos} style={{ borderRadius: 6 }} />
            <Button size="small" type="primary" icon={<KeyOutlined />} onClick={() => navigate('/cambiar-clave')} style={{ borderRadius: 6 }} />
          </div>
        </div>
      </Card>

      {/* ===== Stat Cards ===== */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <div className="paces-stat-card paces-stat-card--primary">
            <div className="paces-stat-card-body">
              <div
                className="paces-stat-icon"
                style={{ background: 'rgba(85,110,230,0.12)' }}
              >
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
              <div
                className="paces-stat-icon"
                style={{ background: 'rgba(52,195,143,0.12)' }}
              >
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
          <div
            className={`paces-stat-card ${vigenciaBaja ? 'paces-stat-card--warning' : 'paces-stat-card--success'}`}
          >
            <div className="paces-stat-card-body">
              <div
                className="paces-stat-icon"
                style={{
                  background: vigenciaBaja ? 'rgba(240,179,69,0.12)' : 'rgba(52,195,143,0.12)',
                }}
              >
                <CalendarOutlined
                  style={{
                    color: vigenciaBaja ? '#f0b345' : '#34c38f',
                    fontSize: 24,
                  }}
                />
              </div>
              <div className="paces-stat-card-content">
                <div className="paces-stat-value">
                  {usuario.diasVigencia > 0 ? `${usuario.diasVigencia}d` : '∞'}
                </div>
                <div className="paces-stat-label">Vigencia de clave</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ===== Two-column layout: Info General + Roles/Sucursales ===== */}
      <Row gutter={[24, 24]}>
        {/* Info General */}
        <Col xs={24} lg={14}>
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '20px 24px' }}>
              <Title
                level={5}
                style={{
                  marginBottom: 0,
                  color: 'var(--paces-text-heading)',
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--paces-border)',
                }}
              >
                <UserOutlined style={{ color: 'var(--paces-primary)', marginRight: 8 }} />
                Información General
              </Title>
              <div>
                {infoItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '11px 0',
                      borderBottom:
                        idx < infoItems.length - 1
                          ? '1px solid var(--paces-border-secondary)'
                          : 'none',
                    }}
                  >
                    <Space size={6}>
                      <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>
                        {item.icon}
                      </span>
                      <span style={{ color: 'var(--paces-text-secondary)', fontSize: 13 }}>
                        {item.label}
                      </span>
                    </Space>
                    {item.valueNode || (
                      <span
                        style={{
                          color: 'var(--paces-text)',
                          fontWeight: 500,
                          fontSize: 13,
                          textAlign: 'right',
                        }}
                      >
                        {item.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* Roles y Sucursales */}
        <Col xs={24} lg={10}>
          <Card
            className="paces-card-erp"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '20px 24px' }}>
              <Title
                level={5}
                style={{
                  marginBottom: 16,
                  color: 'var(--paces-text-heading)',
                }}
              >
                <SafetyOutlined style={{ color: 'var(--paces-primary)', marginRight: 8 }} />
                Roles y Sucursales
              </Title>

              {/* Roles como tags */}
              <div style={{ marginBottom: 20 }}>
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    color: 'var(--paces-text-secondary)',
                    display: 'block',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Roles asignados
                </Text>
                {usuario.roles && usuario.roles.length > 0 ? (
                  <Space wrap size={[6, 6]}>
                    {usuario.roles.map((r) => (
                      <Tag
                        key={r.id}
                        color="blue"
                        style={{ borderRadius: 8, padding: '2px 10px', margin: 0 }}
                      >
                        {r.nombre}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Sin roles asignados
                  </Text>
                )}
              </div>

              {/* Lista de sucursales con rol por sucursal */}
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    color: 'var(--paces-text-secondary)',
                    display: 'block',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Sucursales
                </Text>
                {usuario.sucursalesRoles && usuario.sucursalesRoles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {usuario.sucursalesRoles.map((sr) => {
                      const esActiva = sr.sucursal === sucursalActiva;
                      return (
                        <div
                          key={sr.sucursal}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: esActiva
                              ? 'var(--paces-selected-bg)'
                              : 'var(--paces-topbar-search-bg)',
                            border: esActiva
                              ? '1px solid var(--paces-primary)'
                              : '1px solid transparent',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 4,
                            }}
                          >
                            <Space size={6}>
                              <BankOutlined
                                style={{
                                  color: esActiva
                                    ? 'var(--paces-primary)'
                                    : 'var(--paces-text-secondary)',
                                  fontSize: 13,
                                }}
                              />
                              <Text
                                strong
                                style={{
                                  fontSize: 13,
                                  color: esActiva
                                    ? 'var(--paces-primary)'
                                    : 'var(--paces-text)',
                                }}
                              >
                                {sr.nombreSucursal}
                              </Text>
                            </Space>
                            {esActiva && (
                              <Tag
                                color="blue"
                                style={{
                                  borderRadius: 6,
                                  fontSize: 10,
                                  lineHeight: '16px',
                                  padding: '0 6px',
                                  margin: 0,
                                }}
                                icon={<RightCircleOutlined />}
                              >
                                Activa
                              </Tag>
                            )}
                          </div>
                          <Space size={[4, 4]} wrap>
                            {sr.roles.map((r) => (
                              <Tag
                                key={r.id}
                                style={{
                                  borderRadius: 6,
                                  fontSize: 11,
                                  lineHeight: '18px',
                                  margin: 0,
                                  background: esActiva
                                    ? 'rgba(85,110,230,0.08)'
                                    : 'var(--paces-hover-bg)',
                                  border: 'none',
                                  color: esActiva
                                    ? 'var(--paces-primary)'
                                    : 'var(--paces-text-secondary)',
                                }}
                              >
                                {r.nombre}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Sin sucursales asignadas
                  </Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MiPerfil;
