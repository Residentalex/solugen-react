import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Button, Spin, message, Empty, Grid, Tooltip, Avatar, Alert, Input, Space } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO } from '../../types/administracion';

type ApiError = {
  response?: {
    data?: {
      errorMessage?: string;
      message?: string;
    };
  };
};

const obtenerMensajeError = (error: unknown, mensajePredeterminado: string) => {
  const apiError = error as ApiError;
  return (
    apiError.response?.data?.errorMessage ??
    apiError.response?.data?.message ??
    (error instanceof Error ? error.message : mensajePredeterminado)
  );
};

const Roles: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const screens = Grid.useBreakpoint();
  const securitySucursal = useAuthStore((s) => s.securitySucursal);

  const [roles, setRoles] = useState<RolFullDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargarRoles = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const data = await rolApi.obtenerListado(securitySucursal);
      setRoles(data || []);
    } catch (error) {
      setLoadingError(true);
      message.error(obtenerMensajeError(error, 'Error al cargar roles'));
    } finally {
      setLoading(false);
    }
  }, [securitySucursal]);

  useEffect(() => {
    setActiveModule('MROL');
    updateToolbar({});
    const temporizadorCarga = window.setTimeout(() => {
      void cargarRoles();
    }, 0);
    return () => {
      window.clearTimeout(temporizadorCarga);
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar, cargarRoles]);

  const handleRefresh = useCallback(() => {
    cargarRoles();
  }, [cargarRoles]);

  const isSmall = !screens.md;
  const cardSpan = isSmall ? 24 : screens.xl ? 8 : screens.lg ? 12 : 12;

  const rolesFiltrados = searchText
    ? roles.filter((r) => {
        const q = searchText.toLowerCase();
        return (
          (r.nombre || '').toLowerCase().includes(q) ||
          (r.descripcion || '').toLowerCase().includes(q)
        );
      })
    : roles;

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar roles"
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, rowGap: 12, marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600, minWidth: 0 }}>Administrar Roles</h4>
        <Space wrap>
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MROL/nuevo')}>
              Nuevo Rol
            </Button>
          </PermissionGate>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar roles..."
          allowClear
          style={{ width: '100%', maxWidth: 400 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
          onSearch={(value) => setSearchText(value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.target as HTMLInputElement).blur();
              setSearchText('');
            }
          }}
        />
      </div>

      <Spin spinning={loading}>
        {rolesFiltrados.length === 0 && !loading ? (
          <Empty description={searchText ? 'No hay roles que coincidan con la búsqueda' : 'No hay roles registrados'} />
        ) : (
          <Row gutter={[16, 16]}>
            {rolesFiltrados.map((rol) => (
              <Col key={rol.id} span={cardSpan}>
                <Card
                  hoverable
                  style={{ borderRadius: 8, height: '100%', position: 'relative' }}
                  styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Link
                        to={`/MROL/${rol.id}`}
                        className="paces-doc-link"
                        style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'inline-block' }}
                      >
                        {rol.nombre}
                      </Link>
                      <div className="paces-text-muted" style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8 }}>
                        {rol.descripcion || 'Sin descripción'}
                      </div>
                    </div>
                    <Tag color={rol.activo ? 'green' : 'default'} style={{ marginLeft: 8, flexShrink: 0 }}>
                      {rol.activo ? 'Activo' : 'Inactivo'}
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, minHeight: 28 }}>
                    {(() => {
                      const users = rol.nombresUsuarios || [];
                      if (users.length === 0) {
                        return (
                          <span className="paces-text-muted" style={{ fontSize: 13 }}>Sin usuarios</span>
                        );
                      }
                      const maxShow = 3;
                      return (
                        <Avatar.Group max={{ count: maxShow, style: { backgroundColor: '#f0f0f0', color: '#595959', fontSize: 11, fontWeight: 600 } }}>
                          {users.map((nombre, i) => {
                            const inicial = nombre.trim().charAt(0).toUpperCase();
                            const colores = ['#556ee6', '#f46a6a', '#34c38f', '#f1b44c', '#50a5f1', '#f46a6a', '#e060a0', '#7c6bcb'];
                            return (
                              <Avatar key={`${rol.id}-${i}`} style={{ backgroundColor: colores[i % colores.length], verticalAlign: 'middle', fontSize: 11 }} size={24}>
                                {inicial}
                              </Avatar>
                            );
                          })}
                        </Avatar.Group>
                      );
                    })()}
                  </div>

                  <div style={{ flex: 1, marginBottom: 16 }}>
                      <div className="paces-text-muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Permisos
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(rol.pantallas || []).slice(0, 5).map((pp) => (
                        <Tag key={pp.id} color="blue" style={{ fontSize: 11 }}>
                          {pp.nombre}
                        </Tag>
                      ))}
                      {(rol.pantallas || []).length > 5 && (
                        <Tag style={{ fontSize: 11 }}>+{rol.pantallas.length - 5} más</Tag>
                      )}
                    </div>
                  </div>

                  <div className="paces-border-top" style={{ display: 'flex', gap: 8, paddingTop: 12, marginTop: 'auto' }}>
                    <PermissionGate accion="EDITAR">
                      <Tooltip title="Editar rol">
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/MROL/${rol.id}/editar`)}>
                          Editar
                        </Button>
                      </Tooltip>
                    </PermissionGate>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </>
  );
};

export default Roles;
