import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, Row, Col, message, Grid, Modal } from 'antd';
import { ArrowLeftOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import type { UsuarioDTO } from '../../types/administracion';

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

const EstadoTag: React.FC<{ activo: boolean }> = ({ activo }) => (
  <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
);

const CambiarClaveTag: React.FC<{ debe: boolean }> = ({ debe }) => (
  <Tag color={debe ? 'orange' : 'green'}>{debe ? 'Pendiente' : 'Completado'}</Tag>
);

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const UsuarioDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const [data, setData] = useState<UsuarioDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('MUsuario');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    usuarioApi.obtenerPorId(SUCURSAL_SEGURIDAD, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(res.nombreUsuario);
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
      })
      .finally(() => setLoading(false));
  }, [id, setPageTitleOverride]);

  const handleResetPassword = async () => {
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
  };

  const handleToggleEstado = async () => {
    if (!data) return;
    try {
      await usuarioApi.cambiarEstado(SUCURSAL_SEGURIDAD, data.id, !data.activo);
      message.success(`Usuario ${data.activo ? 'desactivado' : 'activado'} correctamente`);
      setData({ ...data, activo: !data.activo });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!data) return null;

  const isSmall = !screens.md;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/MUsuario')} style={{ padding: 0, marginBottom: 16, fontSize: 14 }}>
        Volver a usuarios
      </Button>

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
              <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#6c757d' }}>{data.nombreUsuario}</span>
              <EstadoTag activo={data.activo} />
            </div>
          </div>
          <Space>
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

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Información General" style={{ borderRadius: 8, marginBottom: 16 }}>
            <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500, color: '#6c757d' }}>
              <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
              <Descriptions.Item label="Nombre">{data.nombre}</Descriptions.Item>
              <Descriptions.Item label="Usuario">
                <span style={{ fontFamily: 'monospace' }}>{data.nombreUsuario}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Estado"><EstadoTag activo={data.activo} /></Descriptions.Item>
              <Descriptions.Item label="Cambiar clave"><CambiarClaveTag debe={data.debeCambiarClave} /></Descriptions.Item>
              <Descriptions.Item label="Vigencia">{data.diasVigencia} días</Descriptions.Item>
              <Descriptions.Item label="Último inicio">{formatFecha(data.ultimoLogin)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Roles por Sucursal" style={{ borderRadius: 8, marginBottom: 16 }}>
            {(data.sucursalesRoles || []).length === 0 ? (
              <span style={{ color: '#6c757d' }}>Sin sucursales asignadas</span>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {(data.sucursalesRoles || []).map((sr) => (
                  <div key={sr.sucursal} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 6, background: '#f8f9fa',
                  }}>
                    <Tag style={{ margin: 0, fontSize: 12 }}>{sr.nombreSucursal}</Tag>
                    <Space size={4}>
                      {sr.roles.map((r) => (
                        <Tag key={r.id} color="blue" style={{ fontSize: 11 }}>{r.nombre}</Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          <Card title="Pantallas" style={{ borderRadius: 8 }}>
            {(data.pantallas || []).length === 0 ? (
              <span style={{ color: '#6c757d' }}>Las pantallas se heredan de los roles</span>
            ) : (
              <Space wrap size={4}>
                {(data.pantallas || []).map((p) => (
                  <Tag key={p.id} color="blue" style={{ fontSize: 11 }}>{p.nombre}</Tag>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UsuarioDetalle;
