import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Button, Modal, Form, Input, Switch, Checkbox, Spin, message, Empty, Space, Grid, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, CheckCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO, PantallaFullDTO } from '../../types/administracion';

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const Roles: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const screens = Grid.useBreakpoint();

  const [roles, setRoles] = useState<RolFullDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<RolFullDTO | null>(null);
  const [pantallasDisponibles, setPantallasDisponibles] = useState<PantallaFullDTO[]>([]);
  const [selectedPantallas, setSelectedPantallas] = useState<Record<number, string[]>>({});
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);

  const cargarRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolApi.obtenerListado(SUCURSAL_SEGURIDAD);
      setRoles(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, [SUCURSAL_SEGURIDAD]);

  const cargarPantallasDisponibles = useCallback(async () => {
    try {
      const data = await rolApi.obtenerPantallasDisponibles(SUCURSAL_SEGURIDAD);
      setPantallasDisponibles(data || []);
    } catch {
      // silent - only needed when opening modal
    }
  }, [SUCURSAL_SEGURIDAD]);

  useEffect(() => {
    setActiveModule('MROL');
    updateToolbar({});
    cargarRoles();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarRoles]);

  const abrirNuevo = () => {
    setEditando(null);
    setSelectedPantallas({});
    form.resetFields();
    cargarPantallasDisponibles();
    setModalVisible(true);
  };

  const abrirEditar = async (rol: RolFullDTO) => {
    setEditando(rol);
    form.setFieldsValue({ nombre: rol.nombre, descripcion: rol.descripcion, activo: rol.activo });
    await cargarPantallasDisponibles();
    const sel: Record<number, string[]> = {};
    for (const pp of rol.pantallas || []) {
      sel[pp.pantalla.id] = pp.acciones.map((a) => a.codigo);
    }
    setSelectedPantallas(sel);
    setModalVisible(true);
  };

  const handleToggleAccion = (pantallaId: number, accionCodigo: string, checked: boolean) => {
    setSelectedPantallas((prev) => {
      const current = prev[pantallaId] || [];
      const updated = checked
        ? [...current, accionCodigo]
        : current.filter((a) => a !== accionCodigo);
      return { ...prev, [pantallaId]: updated };
    });
  };

  const handleTogglePantalla = (pantallaId: number, checked: boolean, todasAcciones: string[]) => {
    setSelectedPantallas((prev) => ({
      ...prev,
      [pantallaId]: checked ? todasAcciones : [],
    }));
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const pantallasPayload = Object.entries(selectedPantallas)
        .filter(([, accs]) => accs.length > 0)
        .map(([pantallaId, accs]) => ({
          pantalla: { id: parseInt(pantallaId) },
          acciones: accs.map((codigo) => ({ codigo })),
        }));
      const payload: RolFullDTO = {
        id: editando?.id || 0,
        nombre: values.nombre,
        descripcion: values.descripcion || '',
        activo: values.activo ?? true,
        pantallas: pantallasPayload,
      };
      if (editando) {
        await rolApi.actualizar(SUCURSAL_SEGURIDAD, payload);
        message.success('Rol actualizado correctamente');
      } else {
        await rolApi.crear(SUCURSAL_SEGURIDAD, payload);
        message.success('Rol creado correctamente');
      }
      setModalVisible(false);
      cargarRoles();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar rol');
    } finally {
      setGuardando(false);
    }
  };

  const isSmall = !screens.md;
  const cardSpan = isSmall ? 24 : screens.xl ? 8 : screens.lg ? 12 : 12;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Administrar Roles</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nuevo Rol
        </Button>
      </div>

      <Spin spinning={loading}>
        {roles.length === 0 && !loading ? (
          <Empty description="No hay roles registrados" />
        ) : (
          <Row gutter={[16, 16]}>
            {roles.map((rol) => (
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

                  <div className="paces-text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 13 }}>
                    <TeamOutlined />
                    <span>{rol.cantidadUsuarios ?? 0} usuarios</span>
                  </div>

                  <div style={{ flex: 1, marginBottom: 16 }}>
                      <div className="paces-text-muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      Permisos
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(rol.pantallas || []).slice(0, 5).map((pp) => (
                        <Tag key={pp.pantalla.id} color="blue" style={{ fontSize: 11 }}>
                          {pp.pantalla.nombre}
                        </Tag>
                      ))}
                      {(rol.pantallas || []).length > 5 && (
                        <Tag style={{ fontSize: 11 }}>+{rol.pantallas.length - 5} más</Tag>
                      )}
                    </div>
                  </div>

                  <div className="paces-border-top" style={{ display: 'flex', gap: 8, paddingTop: 12, marginTop: 'auto' }}>
                    <Tooltip title="Editar rol">
                      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => abrirEditar(rol)}>
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
        title={editando ? 'Editar Rol' : 'Nuevo Rol'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={720}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
                <Input placeholder="Nombre del rol" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="activo" label="Estado" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción del rol" />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Permisos por Pantalla</div>
          {pantallasDisponibles.length === 0 ? (
            <Spin size="small" />
          ) : (
            <div className="paces-border-light" style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 6, padding: 12 }}>
              {pantallasDisponibles.map((pp) => {
                const pantallaId = pp.pantalla.id;
                const selected = selectedPantallas[pantallaId] || [];
                const todas = pp.acciones.map((a) => a.codigo);
                const todasSeleccionadas = todas.length > 0 && todas.every((a) => selected.includes(a));
                const algunaSeleccionada = selected.length > 0;
                return (
                  <div key={pantallaId} className="paces-border-bottom-light" style={{ marginBottom: 10, paddingBottom: 10 }}>
                    <Checkbox
                      checked={todasSeleccionadas}
                      indeterminate={algunaSeleccionada && !todasSeleccionadas}
                      onChange={(e) => handleTogglePantalla(pantallaId, e.target.checked, todas)}
                      style={{ fontWeight: 500, marginBottom: 6 }}
                    >
                      {pp.pantalla.nombre}
                    </Checkbox>
                    <div style={{ paddingLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {pp.acciones.map((acc) => (
                        <Checkbox
                          key={acc.codigo}
                          checked={selected.includes(acc.codigo)}
                          onChange={(e) => handleToggleAccion(pantallaId, acc.codigo, e.target.checked)}
                          style={{ marginRight: 8, fontSize: 12 }}
                        >
                          {acc.nombre}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Roles;
