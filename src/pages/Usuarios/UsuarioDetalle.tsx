import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, Row, Col, message, Modal, Alert, Form, Input, Switch, InputNumber, Tabs, Select, Typography, Collapse, Table } from 'antd';
import { ArrowLeftOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import { rolApi } from '../../api/rolApi';
import type { UsuarioDTO } from '../../types/administracion';
import type { RolDTO, PantallaDTO, UsuarioSucursalRolDTO } from '../../types/auth';

/* ───────── helpers ───────── */
function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function letraInicial(nombre: string): string {
  return (nombre || '?').charAt(0).toUpperCase();
}

function colorDesdeTexto(texto: string): string {
  const colores = ['#556ee6', '#f46a6a', '#34c38f', '#f1b44c', '#50a5f1', '#e83e8c', '#6f42c1', '#20c997'];
  let hash = 0;
  for (let i = 0; i < texto.length; i++) hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

/* ───────── subcomponentes ───────── */
const EstadoTag: React.FC<{ activo: boolean }> = ({ activo }) => (
  <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
);

const CambiarClaveTag: React.FC<{ debe: boolean }> = ({ debe }) => (
  <Tag color={debe ? 'orange' : 'green'}>{debe ? 'Pendiente' : 'Completado'}</Tag>
);

/* ───────── constantes sucursales ───────── */
const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

/* ───────── renderizado de pantallas como tabla ───────── */
function renderPantallasGrouped(pantallas: PantallaDTO[]): React.ReactNode {
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
          render: (_: any, record: PantallaDTO) => (
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.modulos?.[0]?.nombre || 'Sin módulo'}
            </Tag>
          ),
        },
      ]}
    />
  );
}

const SUCURSALES: Sucursal[] = [
  Sucursal.OrensePlaza,
  Sucursal.HiperRomana,
  Sucursal.OrenseVillaHermosa,
  Sucursal.ElOfertazo,
  Sucursal.Consolidado,
  Sucursal.Compra,
];

const SUCURSAL_NOMBRES: Record<number, string> = {
  [Sucursal.OrensePlaza]: 'Orense Plaza',
  [Sucursal.HiperRomana]: 'Hiper Romana',
  [Sucursal.OrenseVillaHermosa]: 'Orense Villa Hermosa',
  [Sucursal.ElOfertazo]: 'El Ofertazo',
  [Sucursal.Consolidado]: 'Consolidado',
  [Sucursal.Compra]: 'Compra',
};

/* ───────── componente principal ───────── */
const UsuarioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  /* estados */
  const [data, setData] = useState<UsuarioDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* estados de edicion */
  const [form] = Form.useForm();
  const [sucursalesRolesEdit, setSucursalesRolesEdit] = useState<UsuarioSucursalRolDTO[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<Record<number, RolDTO[]>>({});
  const [pantallasPorSucursal, setPantallasPorSucursal] = useState<Record<number, PantallaDTO[]>>({});
  const [sucursalActivaTab, setSucursalActivaTab] = useState<Sucursal>(SUCURSALES[0]);
  const [cargandoPantallas, setCargandoPantallas] = useState(false);
  const [cargandoRoles, setCargandoRoles] = useState(false);

  /* ─── efectos de montaje ─── */
  useEffect(() => {
    setActiveModule('MUsuario');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  /* ─── carga de datos del usuario ─── */
  const cargarUsuario = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await usuarioApi.obtenerPorId(SUCURSAL_SEGURIDAD, parseInt(id));
      setData(res);
      setPageTitleOverride(res.nombreUsuario);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [id, setPageTitleOverride]);

  useEffect(() => {
    cargarUsuario();
  }, [cargarUsuario]);

  /* ─── carga de roles disponibles (al entrar en edicion) ─── */
  const cargarRolesDisponibles = useCallback(async () => {
    setCargandoRoles(true);
    try {
      const roles = await rolApi.obtenerListado(SUCURSAL_SEGURIDAD);
      const rolesMapeados = roles.map((r) => ({ id: r.id, nombre: r.nombre }));
      const map: Record<number, RolDTO[]> = {};
      SUCURSALES.forEach((s) => { map[s] = rolesMapeados; });
      setRolesDisponibles(map);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar roles');
    } finally {
      setCargandoRoles(false);
    }
  }, []);

  /* ─── carga de pantallas para la sucursal activa ─── */
  const cargarPantallas = useCallback(async (sucursal: Sucursal) => {
    setCargandoPantallas(true);
    try {
      const pantallas = await rolApi.obtenerPantallasDisponibles(SUCURSAL_SEGURIDAD);
      setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: pantallas }));
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantallas');
      setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
    } finally {
      setCargandoPantallas(false);
    }
  }, []);

  /* cuando cambia la sucursal activa (en modo edicion), recargar pantallas */
  useEffect(() => {
    if (!data) return;
    cargarPantallas(sucursalActivaTab);
  }, [sucursalActivaTab, data, cargarPantallas]);

  /* ─── handlers de modo ─── */
  const entrarEdicion = useCallback(async () => {
    if (!data) return;
    form.setFieldsValue({
      nombre: data.nombre,
      nombreUsuario: data.nombreUsuario,
      activo: data.activo,
      diasVigencia: data.diasVigencia,
    });
    setSucursalesRolesEdit(JSON.parse(JSON.stringify(data.sucursalesRoles || [])));
    setModoEdicion(true);
    await cargarRolesDisponibles();
  }, [data, form, cargarRolesDisponibles]);

  const cancelarEdicion = useCallback(() => {
    if (!data) return;
    // verificar si hay cambios
    const valoresForm = form.getFieldsValue();
    const hayCambiosForm =
      valoresForm.nombre !== data.nombre ||
      valoresForm.nombreUsuario !== data.nombreUsuario ||
      valoresForm.activo !== data.activo ||
      valoresForm.diasVigencia !== data.diasVigencia;
    const sucursalesOriginales = JSON.stringify(data.sucursalesRoles || []);
    const sucursalesActuales = JSON.stringify(sucursalesRolesEdit);
    const hayCambiosRoles = sucursalesOriginales !== sucursalesActuales;

    if (hayCambiosForm || hayCambiosRoles) {
      Modal.confirm({
        title: '¿Descartar cambios?',
        content: 'Los cambios no guardados se perderán.',
        okText: 'Descartar',
        cancelText: 'Seguir editando',
        okButtonProps: { danger: true },
        onOk: () => {
          form.resetFields();
          setSucursalesRolesEdit(JSON.parse(JSON.stringify(data.sucursalesRoles || [])));
          setModoEdicion(false);
        },
      });
    } else {
      form.resetFields();
      setSucursalesRolesEdit(JSON.parse(JSON.stringify(data.sucursalesRoles || [])));
      setModoEdicion(false);
    }
  }, [data, form, sucursalesRolesEdit]);

  const guardar = useCallback(async () => {
    if (!data) return;
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const payload: UsuarioDTO = {
        ...data,
        nombre: values.nombre,
        nombreUsuario: values.nombreUsuario,
        activo: values.activo,
        diasVigencia: values.diasVigencia,
        sucursalesRoles: sucursalesRolesEdit,
      };
      await usuarioApi.actualizar(SUCURSAL_SEGURIDAD, payload);
      message.success('Usuario actualizado correctamente');
      setModoEdicion(false);
      // recargar datos
      const refreshed = await usuarioApi.obtenerPorId(SUCURSAL_SEGURIDAD, data.id);
      setData(refreshed);
      setPageTitleOverride(refreshed.nombreUsuario);
      setPantallasPorSucursal({});
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar usuario');
    } finally {
      setGuardando(false);
    }
  }, [data, form, sucursalesRolesEdit, setPageTitleOverride]);

  /* ─── handlers de acciones ─── */
  const handleResetPassword = useCallback(async () => {
    if (!data) return;
    try {
      const nuevaClave = await usuarioApi.resetearPassword(SUCURSAL_SEGURIDAD, data.id);
      Modal.success({
        title: 'Contraseña reseteada',
        content: `La nueva contraseña temporal es: ${nuevaClave}`,
      });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al resetear contraseña');
    }
  }, [data]);

  const handleToggleEstado = useCallback(async () => {
    if (!data) return;
    try {
      await usuarioApi.cambiarEstado(SUCURSAL_SEGURIDAD, data.id, !data.activo);
      message.success(`Usuario ${data.activo ? 'desactivado' : 'activado'} correctamente`);
      setData({ ...data, activo: !data.activo });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  }, [data]);

  /* ─── handlers de roles ─── */
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

  /* ─── helpers para obtener roles de una sucursal ─── */
  const getRolesSucursal = useCallback(
    (sucursal: Sucursal): RolDTO[] => {
      if (modoEdicion) {
        return sucursalesRolesEdit.find((x) => x.sucursal === sucursal)?.roles || [];
      }
      return data?.sucursalesRoles?.find((x) => x.sucursal === sucursal)?.roles || [];
    },
    [modoEdicion, data, sucursalesRolesEdit]
  );

  /* ─── render: Informacion General ─── */
  const renderInfoGeneral = () => {
    if (modoEdicion) {
      return (
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
              <Col xs={12} sm={8} lg={4}>
                <Form.Item name="diasVigencia" label="Vigencia (días)" rules={[{ required: true, message: 'Obligatorio' }]}>
                  <InputNumber min={1} max={365} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={4} lg={4}>
                <Form.Item name="activo" label="Activo" valuePropName="checked">
                  <Switch checkedChildren="Sí" unCheckedChildren="No" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      );
    }

    return (
      <Card title="Información General" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" labelStyle={{ fontWeight: 500 }}>
          <Descriptions.Item label="ID">{data!.id}</Descriptions.Item>
          <Descriptions.Item label="Nombre">{data!.nombre}</Descriptions.Item>
          <Descriptions.Item label="Usuario">
            <span style={{ fontFamily: 'monospace' }}>{data!.nombreUsuario}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Estado"><EstadoTag activo={data!.activo} /></Descriptions.Item>
          <Descriptions.Item label="Cambiar clave"><CambiarClaveTag debe={data!.debeCambiarClave} /></Descriptions.Item>
          <Descriptions.Item label="Vigencia">{data!.diasVigencia} días</Descriptions.Item>
          <Descriptions.Item label="Último inicio">{formatFecha(data!.ultimoLogin)}</Descriptions.Item>
        </Descriptions>
      </Card>
    );
  };

  /* ─── render: Roles y Pantallas ─── */
  const renderRolesPantallas = () => {
    return (
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
                {/* Roles */}
                <div style={{ marginBottom: 16 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Roles asignados
                  </Typography.Text>
                  {getRolesSucursal(s).length === 0 ? (
                    <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
                      Sin roles asignados en esta sucursal
                    </Typography.Text>
                  ) : modoEdicion ? (
                    <Space wrap size={4}>
                      {getRolesSucursal(s).map((r) => (
                        <Tag
                          key={r.id}
                          color="blue"
                          closable
                          onClose={() => {
                            const nuevosIds = getRolesSucursal(s)
                              .filter((x) => x.id !== r.id)
                              .map((x) => x.id);
                            handleRolesChange(s, nuevosIds);
                          }}
                        >
                          {r.nombre}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Space wrap size={4}>
                      {getRolesSucursal(s).map((r) => (
                        <Tag key={r.id} color="blue">{r.nombre}</Tag>
                      ))}
                    </Space>
                  )}
                </div>

                {/* Select de roles en edicion */}
                {modoEdicion && (
                  <div style={{ marginBottom: 16 }}>
                    <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Agregar roles
                    </Typography.Text>
                    <Select
                      mode="multiple"
                      placeholder="Seleccionar roles..."
                      value={getRolesSucursal(s).map((r) => r.id)}
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
                )}

                {/* Pantallas */}
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
    );
  };

  /* ─── render: loading ─── */
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }
  if (!data) return null;

  /* ─── render: principal ─── */
  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de usuario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargarUsuario}>Reintentar</Button>}
        />
      )}

      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/MUsuario')} style={{ padding: 0, marginBottom: 16, fontSize: 14 }}>
        Volver a usuarios
      </Button>

      {/* Header */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: colorDesdeTexto(data.nombreUsuario),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 24, flexShrink: 0,
          }}>
            {letraInicial(data.nombre)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{data.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <span className="paces-text-secondary" style={{ fontFamily: 'monospace', fontSize: 14 }}>{data.nombreUsuario}</span>
              <EstadoTag activo={data.activo} />
            </div>
          </div>

          {/* Botones segun modo */}
          {modoEdicion ? (
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={guardar} loading={guardando}>
                Guardar
              </Button>
              <Button icon={<CloseOutlined />} onClick={cancelarEdicion} disabled={guardando}>
                Cancelar
              </Button>
            </Space>
          ) : (
            <Space>
              <Button icon={<EditOutlined />} onClick={entrarEdicion}>Editar</Button>
              <Button icon={<KeyOutlined />} onClick={handleResetPassword}>Resetear contraseña</Button>
              <Button
                icon={data.activo ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={handleToggleEstado}
                danger={data.activo}
              >
                {data.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </Space>
          )}
        </div>
      </Card>

      {/* Tabs principales */}
      <Tabs
        type="card"
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: 'Información General',
            children: renderInfoGeneral(),
          },
          {
            key: 'roles',
            label: 'Roles y Pantallas',
            children: renderRolesPantallas(),
          },
        ]}
      />
    </div>
  );
};

export default UsuarioDetalle;
