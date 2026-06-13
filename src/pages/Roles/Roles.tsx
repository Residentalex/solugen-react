import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Button, Spin, message, Empty, Grid, Tooltip, Avatar, Alert, Modal, Descriptions, Typography, Input, Space } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO } from '../../types/administracion';

const { Text } = Typography;

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const Roles: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const screens = Grid.useBreakpoint();

  const [roles, setRoles] = useState<RolFullDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<RolFullDTO | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [searchText, setSearchText] = useState('');

  const cargarRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolApi.obtenerListado(SUCURSAL_SEGURIDAD);
      setRoles(data || []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [SUCURSAL_SEGURIDAD]);

  useEffect(() => {
    setActiveModule('MROL');
    updateToolbar({});
    cargarRoles();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarRoles]);

  const abrirDetalle = async (rol: RolFullDTO) => {
    setDetalleItem(rol);
    setDetalleVisible(true);
    setCargandoDetalle(true);
    try {
      const completo = await rolApi.obtenerPorId(SUCURSAL_SEGURIDAD, rol.id);
      setDetalleItem(completo);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle del rol');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Administrar Roles</h4>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MROL/nuevo')}>
              Nuevo Rol
            </Button>
          </PermissionGate>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar roles..."
          allowClear
          style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
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
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{rol.nombre}</div>
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
                            const colores = ['#556ee6','#f46a6a','#34c38f','#f1b44c','#50a5f1','#f46a6a','#e060a0','#7c6bcb'];
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
                    <Tooltip title="Ver detalle">
                      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => abrirDetalle(rol)}>
                        Ver detalle
                      </Button>
                    </Tooltip>
                    <Tooltip title="Editar rol">
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/MROL/${rol.id}/editar`)}>
                          Editar
                        </Button>
                    </Tooltip>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title={`Detalle del Rol: ${detalleItem?.nombre || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={640}
      >
        <Spin spinning={cargandoDetalle}>
          {detalleItem && (
            <>
              <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
                <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
                <Descriptions.Item label="Descripción">{detalleItem.descripcion || '-'}</Descriptions.Item>
                <Descriptions.Item label="Estado">
                  <Tag color={detalleItem.activo ? 'green' : 'default'}>{detalleItem.activo ? 'Activo' : 'Inactivo'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Usuarios">
                  {detalleItem.cantidadUsuarios != null ? detalleItem.cantidadUsuarios : (detalleItem.nombresUsuarios?.length || 0)}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 24 }}>
                <h5 style={{ marginBottom: 12, fontWeight: 600 }}>Pantallas y Permisos ({detalleItem.pantallas?.length || 0})</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(detalleItem.pantallas || []).map((pp) => (
                    <Card key={pp.id} size="small" className="paces-card" style={{ borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{pp.nombre}</Text>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {pp.acciones.map((acc) => (
                            <Tag key={acc} color="blue" style={{ fontSize: 11 }}>{acc}</Tag>
                          ))}
                        </div>
                      </div>
                      {/* Permisos especiales */}
                      {pp.permisosEspeciales && pp.permisosEspeciales.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, marginLeft: 8 }}>
                          {pp.permisosEspeciales.map((pe) => (
                            <Tag key={pe} color="green" style={{ fontSize: 10 }}>{pe}</Tag>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {detalleItem.nombresUsuarios && detalleItem.nombresUsuarios.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h5 style={{ marginBottom: 8, fontWeight: 600 }}>Usuarios Asignados</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {detalleItem.nombresUsuarios.map((nombre, i) => (
                      <Tag key={i} color="geekblue">{nombre}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default Roles;
