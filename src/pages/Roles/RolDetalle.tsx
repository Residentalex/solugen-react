import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Grid,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { rolApi } from '../../api/rolApi';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import PermissionGate from '../../components/PermissionGate';
import { ErrorDetalle } from '../../components';
import type { RolFullDTO } from '../../types/administracion';
import type { PantallaDTO } from '../../types/auth';

const { Text } = Typography;

type ApiError = {
  response?: {
    data?: {
      errorMessage?: string;
      message?: string;
    };
  };
};

type PantallaDelRol = PantallaDTO & { moduloNombre: string };

const obtenerMensajeError = (error: unknown, mensajePredeterminado: string) => {
  const apiError = error as ApiError;
  return (
    apiError.response?.data?.errorMessage ??
    apiError.response?.data?.message ??
    (error instanceof Error ? error.message : mensajePredeterminado)
  );
};

const COLORES_INICIAL = ['#556ee6', '#f46a6a', '#34c38f', '#f1b44c', '#50a5f1', '#e060a0', '#7c6bcb'];

const RolDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const securitySucursal = useAuthStore((s) => s.securitySucursal);
  const screens = Grid.useBreakpoint();

  const [rol, setRol] = useState<RolFullDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('MROL');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const cargarRol = useCallback(async () => {
    const rolId = Number(id);
    if (!id || !Number.isInteger(rolId) || rolId <= 0) {
      setLoadingError(true);
      return;
    }

    setLoading(true);
    setLoadingError(false);
    try {
      const data = await rolApi.obtenerPorId(securitySucursal, rolId);
      if (!data) {
        message.error('Rol no encontrado en la sucursal seleccionada.');
        setLoadingError(true);
        return;
      }
      setRol(data);
      setPageTitleOverride(data.nombre);
    } catch (error) {
      message.error(obtenerMensajeError(error, 'Error al cargar el rol'));
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [id, securitySucursal, setPageTitleOverride]);

  useEffect(() => {
    const temporizadorCarga = window.setTimeout(() => {
      void cargarRol();
    }, 0);
    return () => window.clearTimeout(temporizadorCarga);
  }, [cargarRol]);

  const pantallas = useMemo<PantallaDelRol[]>(() => {
    return [...(rol?.pantallas ?? [])]
      .map((pantalla) => ({
        ...pantalla,
        moduloNombre: pantalla.modulos?.[0]?.nombre || 'Sin módulo',
      }))
      .sort((a, b) => {
        const ordenA = a.modulos?.[0]?.orden ?? 999;
        const ordenB = b.modulos?.[0]?.orden ?? 999;
        if (ordenA !== ordenB) return ordenA - ordenB;
        return (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre);
      });
  }, [rol]);

  const totalAcciones = useMemo(
    () => pantallas.reduce((total, pantalla) => total + (pantalla.acciones?.length ?? 0), 0),
    [pantallas],
  );

  const columns: ColumnsType<PantallaDelRol> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 130,
      render: (text: string) => (
        <span className="paces-doc-link" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text}
        </span>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Módulo',
      dataIndex: 'moduloNombre',
      width: 170,
      responsive: ['md'],
      render: (text: string) => (
        <Tag color="geekblue" style={{ fontSize: 11 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      dataIndex: 'acciones',
      render: (acciones: string[]) =>
        acciones?.length ? (
          <Space wrap size={2}>
            {acciones.map((accion) => (
              <Tag key={accion} color="blue" style={{ fontSize: 11 }}>
                {accion}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Sin acciones</Text>
        ),
    },
    {
      title: 'Permisos especiales',
      dataIndex: 'permisosEspeciales',
      responsive: ['lg'],
      render: (permisos: string[]) =>
        permisos?.length ? (
          <Space wrap size={2}>
            {permisos.map((permiso) => (
              <Tag key={permiso} color="green" style={{ fontSize: 11 }}>
                {permiso}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Sin permisos especiales</Text>
        ),
    },
  ];

  if (loading || (!rol && !loadingError)) {
    return (
      <div style={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (loadingError && !rol) {
    return <ErrorDetalle mensaje="Error al cargar el rol" rutaVolver="/MROL" />;
  }

  if (!rol) return null;

  const usuarios = rol.nombresUsuarios ?? [];
  const cantidadUsuarios = rol.cantidadUsuarios ?? usuarios.length;

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle del rol"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void cargarRol()}>
              Reintentar
            </Button>
          }
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} style={{ padding: 0, fontSize: 14 }} onClick={() => navigate('/MROL')}>
          Volver a roles
        </Button>
        <div style={{ flex: 1 }} />
        <PermissionGate accion="CREAR">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MROL/nuevo')}>
            Nuevo rol
          </Button>
        </PermissionGate>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{rol.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Text type="secondary">{rol.descripcion || 'Sin descripción'}</Text>
              <Tag color={rol.activo ? 'green' : 'default'}>{rol.activo ? 'Activo' : 'Inactivo'}</Tag>
              <Tag>
                {pantallas.length} pantalla{pantallas.length !== 1 ? 's' : ''} · {totalAcciones} acción
                {totalAcciones !== 1 ? 'es' : ''}
              </Tag>
            </div>
          </div>

          {screens.xs ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <PermissionGate accion="EDITAR">
                <Button block icon={<EditOutlined />} onClick={() => navigate(`/MROL/${rol.id}/editar`)}>
                  Editar
                </Button>
              </PermissionGate>
            </Space>
          ) : (
            <PermissionGate accion="EDITAR">
              <Button icon={<EditOutlined />} onClick={() => navigate(`/MROL/${rol.id}/editar`)}>
                Editar
              </Button>
            </PermissionGate>
          )}
        </div>
      </Card>

      <Tabs
        type="card"
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: 'Información general',
            children: (
              <Card className="paces-card" style={{ borderRadius: 8 }}>
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 2 }}
                  styles={{ content: { background: 'transparent' } }}
                >
                  <Descriptions.Item label="ID">{rol.id}</Descriptions.Item>
                  <Descriptions.Item label="Nombre">{rol.nombre}</Descriptions.Item>
                  <Descriptions.Item label="Descripción" span={2}>
                    {rol.descripcion || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    <Tag color={rol.activo ? 'green' : 'default'}>{rol.activo ? 'Activo' : 'Inactivo'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Usuarios asignados">{cantidadUsuarios}</Descriptions.Item>
                  <Descriptions.Item label="Pantallas">{pantallas.length}</Descriptions.Item>
                  <Descriptions.Item label="Total de acciones">{totalAcciones}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'pantallas',
            label: `Pantallas y permisos (${pantallas.length})`,
            children: pantallas.length === 0 ? (
              <Card className="paces-card" style={{ borderRadius: 8 }}>
                <Empty description="Este rol no tiene pantallas asignadas." />
              </Card>
            ) : (
              <Card className="paces-card" style={{ borderRadius: 8 }}>
                <Table
                  className="paces-list-table"
                  columns={columns}
                  dataSource={pantallas}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Card>
            ),
          },
          {
            key: 'usuarios',
            label: `Usuarios (${cantidadUsuarios})`,
            children: usuarios.length === 0 ? (
              <Card className="paces-card" style={{ borderRadius: 8 }}>
                <Empty description="Ningún usuario tiene este rol asignado." />
              </Card>
            ) : (
              <Card className="paces-card" style={{ borderRadius: 8 }}>
                <Space wrap>
                  {usuarios.map((nombre, indice) => (
                    <Tag
                      key={`${nombre}-${indice}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px' }}
                    >
                      <Avatar
                        size={18}
                        style={{
                          backgroundColor: COLORES_INICIAL[indice % COLORES_INICIAL.length],
                          fontSize: 10,
                        }}
                      >
                        {nombre.trim().charAt(0).toUpperCase()}
                      </Avatar>
                      {nombre}
                    </Tag>
                  ))}
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default RolDetalle;
