import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, message, Alert, Tabs, Table, Typography } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { pantallaApi } from '../../api/pantallaApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import type { PantallaDTO, PantallaEntidadDTO, PermisoEspecialConAsignacionDTO } from '../../types/auth';
import { ErrorDetalle } from '../../components';
import PermissionGate from '../../components/PermissionGate';

const { Text } = Typography;

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const PantallaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [data, setData] = useState<PantallaDTO | null>(null);
  const [permisosEspeciales, setPermisosEspeciales] = useState<PermisoEspecialConAsignacionDTO[]>([]);

  useEffect(() => {
    setActiveModule('MPantalla');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const cargarPantalla = useCallback(async () => {
    if (!id || sucursalActiva === undefined) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await pantallaApi.obtenerPorId(sucursalActiva, parseInt(id));
      if (!res) {
        message.error('Pantalla no encontrada');
        setLoadingError(true);
        return;
      }
      setData(res);
      setPageTitleOverride(res.codigo);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar pantalla');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [id, sucursalActiva, setPageTitleOverride]);

  const cargarPermisos = useCallback(async () => {
    if (!id) return;
    try {
      const result = await permisoEspecialApi.obtenerPorPantalla(SUCURSAL_SEGURIDAD, parseInt(id));
      setPermisosEspeciales(result || []);
    } catch {
      // no crítico
    }
  }, [id]);

  useEffect(() => {
    cargarPantalla();
    cargarPermisos();
  }, [cargarPantalla, cargarPermisos]);

  if (loading || (!data && !loadingError)) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar la pantalla" rutaVolver="/MPantalla" />;
  }
  if (!data) return null;

  const modulosItems = (data.modulos || []).length > 0 ? (
    <Table
      dataSource={data.modulos}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        { title: 'Nombre', dataIndex: 'nombre', render: (t: string) => <Text strong>{t}</Text> },
        { title: 'Orden', dataIndex: 'orden', width: 80, align: 'center' as const },
      ]}
    />
  ) : (
    <Text type="secondary">Sin módulos asignados</Text>
  );

  const entidadesItems = (data.entidades || []).length > 0 ? (
    <Table
      dataSource={data.entidades}
      rowKey={(r: PantallaEntidadDTO) => r.entidadCodigo + (r.tipoEntidad || '')}
      size="small"
      pagination={false}
      columns={[
        { title: 'Código', dataIndex: 'entidadCodigo', width: 140, render: (t: string) => <Text code>{t}</Text> },
        { title: 'Tipo', dataIndex: 'tipoEntidad', width: 100, render: (t?: string) => t ? <Tag>{t}</Tag> : <Tag style={{ color: '#999' }}>—</Tag> },
        { title: 'Orden', dataIndex: 'orden', width: 80, align: 'center' as const },
      ]}
    />
  ) : (
    <Text type="secondary">Sin entidades asociadas</Text>
  );

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de pantalla"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargarPantalla}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/MPantalla')} style={{ padding: 0, fontSize: 14 }}>
          Volver a pantallas
        </Button>
        <div style={{ flex: 1 }} />
        <PermissionGate accion="CREAR">
          <Button icon={<PlusOutlined />} onClick={() => navigate('/MPantalla/nuevo')} style={{ marginRight: 8 }}>
            Nuevo
          </Button>
        </PermissionGate>
        <PermissionGate accion="EDITAR">
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/MPantalla/${data.id}/editar`)}>
            Editar
          </Button>
        </PermissionGate>
      </div>

      {/* Datos Generales */}
      <Card title="Datos Generales" style={{ borderRadius: 8, marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered styles={{ label: { fontWeight: 500 } }}>
          <Descriptions.Item label="Código">
            <Text code>{data.codigo}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Nombre">{data.nombre}</Descriptions.Item>
          <Descriptions.Item label="Ruta">{data.ruta || '-'}</Descriptions.Item>
          <Descriptions.Item label="Grupo">{data.grupo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Tipo">{data.tipo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Orden">{data.orden}</Descriptions.Item>
          <Descriptions.Item label="¿Es Reporte?">{data.esReporte ? 'Sí' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Activo">
            <Tag color={data.activo ? 'green' : 'red'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Tabs */}
      <Tabs
        type="card"
        defaultActiveKey="acciones"
        items={[
          {
            key: 'acciones',
            label: 'Acciones',
            children: (
              <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                {data.acciones && data.acciones.length > 0 ? (
                  <Space wrap size={4}>
                    {data.acciones.map((a) => (
                      <Tag key={a} color="blue">{a}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">Sin acciones asignadas</Text>
                )}
              </Card>
            ),
          },
          {
            key: 'modulos',
            label: 'Módulos',
            children: (
              <Card title="Módulos de la Pantalla" style={{ borderRadius: 8, marginBottom: 16 }}>
                {modulosItems}
              </Card>
            ),
          },
          {
            key: 'permisos',
            label: 'Permisos Especiales',
            children: (
              <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                {(() => {
                  const asignados = permisosEspeciales.filter((p) => p.asignado);
                  return asignados.length > 0 ? (
                    <Space wrap size={4}>
                      {asignados.map((p) => (
                        <Tag key={p.id} color="green">
                          {p.nombre || p.codigo}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">No hay permisos especiales asignados</Text>
                  );
                })()}
              </Card>
            ),
          },
          {
            key: 'entidades',
            label: 'Entidades',
            children: (
              <Card title="Entidades/Documentos Asociados" style={{ borderRadius: 8, marginBottom: 16 }}>
                {entidadesItems}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default PantallaDetalle;
