import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Select, Spin, message, Tabs, Tag, Space, Typography, Alert, Table, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import { authApi } from '../../api/authApi';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';
import { rolApi } from '../../api/rolApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';

import type { UsuarioDTO } from '../../types/administracion';
import type { RolDTO, PantallaDTO, UsuarioSucursalRolDTO, AuthSucursalPermitidaDTO } from '../../types/auth';
import BuscarEmpleadoModal from '../../components/BuscarEmpleadoModal/BuscarEmpleadoModal';
import EntidadImagen from '../../components/EntidadImagen';

interface PantallaConRoles extends PantallaDTO {
  rolesAcceso: string[];
}

function renderPantallasGrouped(pantallas: PantallaConRoles[]): React.ReactNode {
  const data = [...pantallas].sort((a, b) => {
    const modA = a.modulos?.[0]?.orden ?? 999;
    const modB = b.modulos?.[0]?.orden ?? 999;
    if (modA !== modB) return modA - modB;
    return a.orden - b.orden;
  });

  return (
    <Table
      dataSource={data}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        {
          title: 'Código',
          dataIndex: 'codigo',
          width: 100,
          render: (text: string) => (
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#556ee6', fontSize: 12 }}>
              {text}
            </span>
          ),
        },
        {
          title: 'Nombre',
          dataIndex: 'nombre',
          render: (text: string) => <span style={{ fontSize: 13 }}>{text}</span>,
        },
        {
          title: 'Módulo',
          width: 150,
          render: (_: any, record: PantallaConRoles) => (
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.modulos?.[0]?.nombre || 'Sin módulo'}
            </Tag>
          ),
        },
        {
          title: 'Acceso vía Rol',
          width: 200,
          render: (_: any, record: PantallaConRoles) => (
            <Space wrap size={2}>
              {(record.rolesAcceso || []).map((rol) => (
                <Tag key={rol} color="blue" style={{ fontSize: 11 }}>{rol}</Tag>
              ))}
            </Space>
          ),
        },
      ]}
    />
  );
}

function letraInicial(nombre: string): string {
  return (nombre || '?').charAt(0).toUpperCase();
}

const UsuarioFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEditar = Boolean(id);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const navigationConfirmedRef = useFormularioNavigation();

  const securitySucursal = useAuthStore((s) => s.securitySucursal);

  const [sucursalesAuth, setSucursalesAuth] = useState<AuthSucursalPermitidaDTO[]>([]);

  const SUCURSALES: Sucursal[] = useMemo(() =>
    sucursalesAuth.map((s) => s.sucursal),
    [sucursalesAuth]
  );
  const SUCURSAL_NOMBRES: Record<number, string> = useMemo(() =>
    Object.fromEntries(sucursalesAuth.map((s) => [s.sucursal, toTitleCase(s.nombre)])),
    [sucursalesAuth]
  );

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [data, setData] = useState<UsuarioDTO | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoDTO[]>([]);
  const [buscarEmpleadoOpen, setBuscarEmpleadoOpen] = useState(false);
  const [empleadoLabel, setEmpleadoLabel] = useState('');
  const [sucursalesRolesEdit, setSucursalesRolesEdit] = useState<UsuarioSucursalRolDTO[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<Record<number, RolDTO[]>>({});
  const [sucursalActivaTab, setSucursalActivaTab] = useState<Sucursal>(0 as Sucursal);
  const [pantallasPorSucursal, setPantallasPorSucursal] = useState<Record<number, PantallaConRoles[]>>({});
  const [cargandoPantallas, setCargandoPantallas] = useState(false);
  const [cargandoRoles, setCargandoRoles] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    authApi.obtenerSucursalesAuth()
      .then(setSucursalesAuth)
      .catch((err) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales');
      });
  }, []);

  useEffect(() => {
    setActiveModule('MUsuario');
    updateToolbar({});
    cargarEmpleados();
    // cargarRolesDisponibles se dispara desde el efecto de sucursalesAuth
    if (id) cargarUsuario(parseInt(id));
    else form.setFieldsValue({ activo: true, claveNoExpira: false, diasVigencia: 30 });
    return () => resetToolbar();
  }, [id]);

  useEffect(() => {
    if (sucursalesAuth.length > 0) {
      cargarRolesDisponibles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalesAuth]);

  const cargarEmpleados = async () => {
    try {
      const emps = await empleadoApi.obtenerTodos(securitySucursal);
      setEmpleados(emps || []);
    } catch {
      // silent
    }
  };

  const cargarUsuario = async (userId: number) => {
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await usuarioApi.obtenerPorId(securitySucursal, userId);
      setData(res);
      form.setFieldsValue({
        nombre: res.nombre,
        nombreUsuario: res.nombreUsuario,
        activo: res.activo,
        claveNoExpira: res.claveNoExpira,
        diasVigencia: res.diasVigencia,
        empleadoID: res.empleadoID,
      });
      setSucursalesRolesEdit(JSON.parse(JSON.stringify(res.sucursalesRoles || [])));
      if (res.empleadoID) {
        try {
          const emp = await empleadoApi.obtenerPorCodigo(securitySucursal, res.empleadoID);
          if (emp?.nombre) {
            setEmpleadoLabel(`${emp.codigo} - ${emp.nombre}`);
          } else {
            setEmpleadoLabel(res.empleadoID);
          }
        } catch {
          setEmpleadoLabel(`${res.empleadoID} (sin nombre)`);
        }
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  };

  const cargarRolesDisponibles = async () => {
    setCargandoRoles(true);
    try {
      const roles = await rolApi.obtenerListado(securitySucursal);
      const rolesMapeados = roles.map((r) => ({ id: r.id, nombre: r.nombre }));
      const map: Record<number, RolDTO[]> = {};
      SUCURSALES.forEach((s) => { map[s] = rolesMapeados; });
      setRolesDisponibles(map);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar roles');
    } finally {
      setCargandoRoles(false);
    }
  };

  const cargarPantallas = useCallback(async (sucursal: Sucursal, rolesUsuario: RolDTO[]) => {
    setCargandoPantallas(true);
    try {
      if (rolesUsuario.length === 0) {
        setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
        return;
      }
      const promesas = rolesUsuario.map((r) => rolApi.obtenerPorId(securitySucursal, r.id));
      const rolesCompletos = await Promise.all(promesas);
      const pantallasMap = new Map<number, PantallaConRoles>();
      rolesCompletos.forEach((rolCompleto) => {
        (rolCompleto.pantallas || []).forEach((pantalla) => {
          const existente = pantallasMap.get(pantalla.id);
          if (existente) {
            if (!existente.rolesAcceso.includes(rolCompleto.nombre)) {
              existente.rolesAcceso.push(rolCompleto.nombre);
            }
          } else {
            pantallasMap.set(pantalla.id, {
              ...pantalla,
              rolesAcceso: [rolCompleto.nombre],
            });
          }
        });
      });
      setPantallasPorSucursal((prev) => ({
        ...prev,
        [sucursal]: Array.from(pantallasMap.values()),
      }));
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantallas');
      setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
    } finally {
      setCargandoPantallas(false);
    }
  }, []);

  const rolesSucursalActiva = useMemo(
    () => sucursalesRolesEdit?.find((x) => x.sucursal === sucursalActivaTab)?.roles || [],
    [sucursalesRolesEdit, sucursalActivaTab]
  );

  useEffect(() => {
    cargarPantallas(sucursalActivaTab, rolesSucursalActiva);
  }, [sucursalActivaTab, rolesSucursalActiva, cargarPantallas]);

  const handleRolesChange = useCallback((sucursal: Sucursal, selectedIds: number[]) => {
    const rolesDisponiblesSuc = rolesDisponibles[sucursal] || [];
    const nuevosRoles = selectedIds
      .map((rid) => rolesDisponiblesSuc.find((r) => r.id === rid))
      .filter(Boolean) as RolDTO[];

    setSucursalesRolesEdit((prev) => {
      const copia = [...prev];
      const idx = copia.findIndex((x) => x.sucursal === sucursal);
      if (nuevosRoles.length === 0) {
        if (idx >= 0) copia.splice(idx, 1);
      } else {
        const entry: UsuarioSucursalRolDTO = {
          sucursal,
          nombreSucursal: SUCURSAL_NOMBRES[sucursal] || '',
          roles: nuevosRoles,
        };
        if (idx >= 0) copia[idx] = entry;
        else copia.push(entry);
      }
      return copia;
    });
  }, [rolesDisponibles]);

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      if (esEditar && data) {
        const payload: UsuarioDTO = {
          ...data,
          nombre: values.nombre,
          nombreUsuario: values.nombreUsuario,
          activo: values.activo,
          claveNoExpira: values.claveNoExpira ?? false,
          diasVigencia: values.diasVigencia,
          empleadoID: values.empleadoID || data.empleadoID,
          sucursalesRoles: sucursalesRolesEdit,
        };
        await usuarioApi.actualizar(securitySucursal, payload);
        message.success('Usuario actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/MUsuario/${data.id}`);
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const pass = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const creado = await usuarioApi.crear(securitySucursal, { ...values, contrasena: pass, debeCambiarClave: true, claveNoExpira: values.claveNoExpira ?? false, sucursalesRoles: sucursalesRolesEdit });
        Modal.success({
          title: 'Usuario creado',
          content: (
            <div>
              <p>Usuario creado correctamente.</p>
              <p><strong>Contraseña temporal:</strong> <code style={{ fontSize: 16 }}>{pass}</code></p>
            </div>
          ),
          onOk: () => {
            navigationConfirmedRef.current = true;
            navigate('/MUsuario');
          },
        });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar usuario');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        if (esEditar && data) navigate(`/MUsuario/${data.id}`);
        else navigate('/MUsuario');
      },
    });
  };

  if (esEditar && loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }
  if (esEditar && loadingError) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Alert message="Error al cargar el usuario" type="error" showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/MUsuario')}>Volver a usuarios</Button>
      </div>
    );
  }
  if (esEditar && !data) return null;

  return (
    <div>
      {loadingError && (
        <Alert message="Error al cargar detalle de usuario" type="error" showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => id && cargarUsuario(parseInt(id))}>Reintentar</Button>}
        />
      )}

      {esEditar && data ? (
        <Card style={{ borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <EntidadImagen tipo="USUARIO" entidadID={data.id} fallback={letraInicial(data.nombre)} size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{data.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <span className="paces-text-secondary" style={{ fontFamily: 'monospace', fontSize: 14 }}>{data.nombreUsuario}</span>
                <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
              </div>
            </div>
            <Space>
              <PermissionGate accion={esEditar ? 'EDITAR' : 'CREAR'}>
                <Button type="primary" icon={<SaveOutlined />} onClick={guardar} loading={guardando}>Guardar</Button>
              </PermissionGate>
              <Button icon={<CloseOutlined />} onClick={handleCancelar} disabled={guardando}>Cancelar</Button>
            </Space>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Nuevo Usuario</h4>
          <Space>
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<SaveOutlined />} onClick={guardar} loading={guardando}>Guardar</Button>
            </PermissionGate>
            <Button icon={<ArrowLeftOutlined />} onClick={handleCancelar}>Volver</Button>
          </Space>
        </div>
      )}

      <Tabs type="card" defaultActiveKey="info" items={[
        {
          key: 'info',
          label: 'Información General',
          children: (
            <Card title="Información General" style={{ borderRadius: 8, marginBottom: 16 }}>
              <Form form={form} layout="vertical" size="small">
                <Row gutter={16}>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="nombreUsuario" label="Usuario" rules={[{ required: true, message: 'Obligatorio' }]}>
                      <Input placeholder="Nombre de cuenta" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Obligatorio' }]}>
                      <Input placeholder="Nombre y apellidos" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div>
                      <Form.Item label="Empleado" style={{ marginBottom: 0 }}>
                        <Input placeholder=" " value={empleadoLabel} readOnly suffix={<SearchOutlined />} onClick={() => setBuscarEmpleadoOpen(true)} />
                      </Form.Item>
                    </div>
                    <Form.Item name="empleadoID" hidden>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8} lg={3}>
                    <Form.Item name="diasVigencia" label="Vigencia (días)" rules={[{ required: true, message: 'Obligatorio' }]}>
                      <InputNumber min={1} max={365} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={4} lg={3}>
                    <Form.Item name="claveNoExpira" label="Clave no expira" valuePropName="checked">
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={4} lg={3}>
                    <Form.Item name="activo" label="Activo" valuePropName="checked">
                      <Switch checkedChildren="Sí" unCheckedChildren="No" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          ),
        },
        {
          key: 'roles',
          label: 'Roles y Pantallas',
          children: (
            <Card title="Roles y Pantallas" style={{ borderRadius: 8, marginBottom: 16 }}>
              <Tabs
                type="card"
                activeKey={String(sucursalActivaTab)}
                onChange={(key) => setSucursalActivaTab(Number(key) as Sucursal)}
                items={SUCURSALES.map((s) => ({
                  key: String(s),
                  label: SUCURSAL_NOMBRES[s] || `Sucursal ${s}`,
                  children: (
                    <div style={{ minHeight: 120 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Roles asignados
                        </Typography.Text>
                        {rolesSucursalActiva.length === 0 ? (
                          <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
                            Sin roles asignados en esta sucursal
                          </Typography.Text>
                        ) : (
                          <Space wrap size={4}>
                            {rolesSucursalActiva.map((r) => (
                              <Tag key={r.id} color="blue" closable onClose={() => {
                                const nuevosIds = rolesSucursalActiva
                                  .filter((x) => x.id !== r.id)
                                  .map((x) => x.id);
                                handleRolesChange(s, nuevosIds);
                              }}>
                                {r.nombre}
                              </Tag>
                            ))}
                          </Space>
                        )}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Agregar roles
                        </Typography.Text>
                        <Select
                          mode="multiple"
                          placeholder="Seleccionar roles..."
                          value={rolesSucursalActiva.map((r) => r.id)}
                          onChange={(ids) => handleRolesChange(s, ids)}
                          options={rolesDisponibles[s]?.map((r) => ({
                            label: r.nombre,
                            value: r.id,
                          })) || []}
                          style={{ width: '100%' }}
                          loading={cargandoRoles}
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      </div>

                      <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Pantallas disponibles
                        </Typography.Text>
                        {cargandoPantallas ? (
                          <Spin size="small" />
                        ) : (pantallasPorSucursal[s] || []).length === 0 ? (
                          <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
                            No hay pantallas disponibles en esta sucursal
                          </Typography.Text>
                        ) : renderPantallasGrouped(pantallasPorSucursal[s] || [])}
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          ),
        },
      ]} />

      <BuscarEmpleadoModal
        open={buscarEmpleadoOpen}
        onClose={() => setBuscarEmpleadoOpen(false)}
        onSelect={(emp) => {
          form.setFieldValue('empleadoID', emp.codigo);
          setEmpleadoLabel(`${emp.codigo} - ${emp.nombre}`);
          form.setFieldValue('nombre', emp.nombre);
        }}
      />
    </div>
  );
};

export default UsuarioFormulario;
