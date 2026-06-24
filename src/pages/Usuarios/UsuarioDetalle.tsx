import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { authApi } from '../../api/authApi';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, message, Modal, Alert, Tabs, Typography, Table } from 'antd';
import { ArrowLeftOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import { rolApi } from '../../api/rolApi';

import type { UsuarioDTO } from '../../types/administracion';
import type { RolDTO, PantallaDTO, AuthSucursalPermitidaDTO } from '../../types/auth';
import { ErrorDetalle } from '../../components';
import EntidadImagen from '../../components/EntidadImagen';

/* ───────── helpers ───────── */
function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function letraInicial(nombre: string): string {
  return (nombre || '?').charAt(0).toUpperCase();
}

/* ───────── subcomponentes ───────── */
const EstadoTag: React.FC<{ activo: boolean }> = ({ activo }) => (
  <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
);

const CambiarClaveTag: React.FC<{ debe: boolean }> = ({ debe }) => (
  <Tag color={debe ? 'orange' : 'green'}>{debe ? 'Pendiente' : 'Completado'}</Tag>
);

/* ───────── tipo extendido para pantallas con roles de acceso ───────── */
interface PantallaConRoles extends PantallaDTO {
  rolesAcceso: string[];
}

/* ───────── renderizado de pantallas como tabla ───────── */
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

/* ───────── componente principal ───────── */
const UsuarioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  const [sucursalesAuth, setSucursalesAuth] = useState<AuthSucursalPermitidaDTO[]>([]);
  const SUCURSALES: Sucursal[] = useMemo(() =>
    sucursalesAuth.map((s) => s.sucursal),
    [sucursalesAuth]
  );
  const SUCURSAL_NOMBRES: Record<number, string> = useMemo(() =>
    Object.fromEntries(sucursalesAuth.map((s) => [s.sucursal, s.nombre])),
    [sucursalesAuth]
  );

  /* estados */
  const [data, setData] = useState<UsuarioDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [pantallasPorSucursal, setPantallasPorSucursal] = useState<Record<number, PantallaConRoles[]>>({});
  const [sucursalActivaTab, setSucursalActivaTab] = useState<Sucursal>(0 as Sucursal);
  const [cargandoPantallas, setCargandoPantallas] = useState(false);
  const securitySucursal = useAuthStore((s) => s.securitySucursal);

  /* ─── efectos de montaje ─── */
  useEffect(() => {
    setActiveModule('MUsuario');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    authApi.obtenerSucursalesAuth()
      .then(setSucursalesAuth)
      .catch((err) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales');
      });
  }, []);

  /* ─── carga de datos del usuario ─── */
  const cargarUsuario = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await usuarioApi.obtenerPorId(securitySucursal, parseInt(id));
      if (!res) {
        message.error('Usuario no encontrado en la sucursal seleccionada.');
        setLoadingError(true);
        return;
      }
      setData(res);
      setPageTitleOverride(res.nombreUsuario);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [id, setPageTitleOverride, securitySucursal]);

  useEffect(() => {
    cargarUsuario();
  }, [cargarUsuario]);

  /* ─── carga de pantallas filtradas por los roles del usuario en la sucursal ─── */
  const cargarPantallas = useCallback(async (sucursal: Sucursal, rolesUsuario: RolDTO[]) => {
    setCargandoPantallas(true);
    try {
      if (rolesUsuario.length === 0) {
        setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
        return;
      }

      // Obtener detalles completos de cada rol (incluye sus pantallas)
      const promesas = rolesUsuario.map((r) => rolApi.obtenerPorId(securitySucursal, r.id));
      const rolesCompletos = await Promise.all(promesas);

      // Unir pantallas de todos los roles y registrar qué rol da acceso
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
  }, [securitySucursal]);

  /* cuando cambia la sucursal activa o los roles, recargar pantallas filtradas */
  const rolesSucursalActiva = useMemo(
    () => data?.sucursalesRoles?.find((x) => x.sucursal === sucursalActivaTab)?.roles || [],
    [data, sucursalActivaTab]
  );

  useEffect(() => {
    if (!data) return;
    cargarPantallas(sucursalActivaTab, rolesSucursalActiva);
  }, [sucursalActivaTab, data, cargarPantallas, rolesSucursalActiva]);

  /* ─── handlers de acciones ─── */
  const handleResetPassword = useCallback(async () => {
    if (!data) return;
    try {
      const nuevaClave = await usuarioApi.resetearPassword(securitySucursal, data.id);
      Modal.success({
        title: 'Contraseña reseteada',
        content: `La nueva contraseña temporal es: ${nuevaClave}`,
      });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al resetear contraseña');
    }
  }, [data, securitySucursal]);

  const handleToggleEstado = useCallback(async () => {
    if (!data) return;
    try {
      await usuarioApi.cambiarEstado(securitySucursal, data.id, !data.activo);
      message.success(`Usuario ${data.activo ? 'desactivado' : 'activado'} correctamente`);
      setData({ ...data, activo: !data.activo });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  }, [data, securitySucursal]);

  /* ─── render: Informacion General ─── */
  const renderInfoGeneral = () => {
    return (
      <Card title="Información General" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" styles={{ label: { fontWeight: 500 } }}>
          <Descriptions.Item label="ID">{data!.id}</Descriptions.Item>
          <Descriptions.Item label="Nombre">{data!.nombre}</Descriptions.Item>
          <Descriptions.Item label="Usuario">
            <span style={{ fontFamily: 'monospace' }}>{data!.nombreUsuario}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Estado"><EstadoTag activo={data!.activo} /></Descriptions.Item>
          <Descriptions.Item label="Cambiar clave"><CambiarClaveTag debe={data!.debeCambiarClave} /></Descriptions.Item>
          <Descriptions.Item label="Vigencia">{data!.diasVigencia} días</Descriptions.Item>
          <Descriptions.Item label="Clave no expira">
            <Tag color={data!.claveNoExpira ? 'green' : 'default'}>{data!.claveNoExpira ? 'Sí' : 'No'}</Tag>
          </Descriptions.Item>
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
                        <Tag key={r.id} color="blue">{r.nombre}</Tag>
                      ))}
                    </Space>
                  )}
                </div>

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
  if (loading || (!data && !loadingError)) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar el usuario" rutaVolver="/MUsuario" />;
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

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/MUsuario')} style={{ padding: 0, fontSize: 14 }}>
          Volver a usuarios
        </Button>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MUsuario/nuevo')}>
          Nuevo
        </Button>
      </div>

      {/* Header */}
      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <EntidadImagen
            tipo="USUARIO"
            entidadID={data.id}
            fallback={letraInicial(data.nombre)}
            size={64}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{data.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <span className="paces-text-secondary" style={{ fontFamily: 'monospace', fontSize: 14 }}>{data.nombreUsuario}</span>
              <EstadoTag activo={data.activo} />
            </div>
          </div>

          <Space>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/MUsuario/${data.id}/editar`)}>Editar</Button>
            <Button icon={<KeyOutlined />} onClick={handleResetPassword}>Resetear contraseña</Button>
            <Button
              icon={data.activo ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={handleToggleEstado}
              danger={data.activo}
            >
              {data.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </Space>
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
