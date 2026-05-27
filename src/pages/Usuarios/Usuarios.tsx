import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Tag, Button, Modal, Form, Input as AntInput, Switch, message, Space, Row, Col, Card, Typography, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { usuarioApi } from '../../api/usuarioApi';
import type { UsuarioDTO } from '../../types/administracion';

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

const { Text } = Typography;

const Usuarios: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

  const [data, setData] = useState<UsuarioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [_searchText, setSearchText] = useState('');
  const [loadingError, setLoadingError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<UsuarioDTO | null>(null);
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async (busqueda?: string) => {
    setLoading(true);
    try {
      let result: UsuarioDTO[];
      if (busqueda) {
        result = await usuarioApi.filtrar(SUCURSAL_SEGURIDAD, busqueda, busqueda);
      } else {
        result = await usuarioApi.obtenerListado(SUCURSAL_SEGURIDAD);
      }
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar usuarios');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveModule('MUsuario');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    cargarDatos(value.trim() || undefined);
  };

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      if (editando) {
        await usuarioApi.actualizar(SUCURSAL_SEGURIDAD, { ...editando, ...values });
        message.success('Usuario actualizado correctamente');
      } else {
        await usuarioApi.crear(SUCURSAL_SEGURIDAD, values);
        message.success('Usuario creado correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar usuario');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<UsuarioDTO> = [
    {
      title: 'Usuario',
      key: 'usuario',
      width: 220,
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate(`/MUsuario/${record.id}`)}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            backgroundColor: colorDesdeTexto(record.nombreUsuario),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 14, flexShrink: 0,
          }}>
            {letraInicial(record.nombre)}
          </div>
          <div>
            <Text className="paces-text-primary" strong style={{ fontSize: 13, lineHeight: 1.3 }}>
              {record.nombreUsuario}
              <RightOutlined style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }} />
            </Text>
            <br />
            <Text type="secondary" style={{ lineHeight: 1.3 }}>{record.nombre}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Roles',
      key: 'roles',
      width: 200,
      render: (_, record) => (
        <Space wrap size={4}>
          {(record.roles || []).map((r) => (
            <Tag key={r.id} color="blue" style={{ fontSize: 11 }}>{r.nombre}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Sucursales',
      key: 'sucursales',
      width: 200,
      render: (_, record) => (
        <Space wrap size={2}>
          {(record.sucursalesRoles || []).map((sr) => (
            <Tag key={sr.sucursal} style={{ fontSize: 11 }}>{sr.nombreSucursal}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Último inicio',
      dataIndex: 'ultimoLogin',
      key: 'ultimoLogin',
      width: 170,
      render: (val: string) => (
        <Text type="secondary">{formatFecha(val)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },

  ];

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar usuarios"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); setSearchText(''); cargarDatos(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <Input.Search
          placeholder="Buscar por usuario o nombre..."
          allowClear
          onSearch={handleSearch}
          style={{ width: 400 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nuevo Usuario
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => { setLoadingError(false); setSearchText(''); cargarDatos(); }} />
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<UsuarioDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 920 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} usuarios`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
          }}
        />
      </Card>

      <Modal
        title={editando ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={560}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombreUsuario" label="Usuario" rules={[{ required: true, message: 'Obligatorio' }]}>
                <AntInput placeholder="Nombre de cuenta" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, message: 'Obligatorio' }]}>
                <AntInput placeholder="Nombre y apellidos" />
              </Form.Item>
            </Col>
          </Row>
          {!editando && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="contrasena" label="Contraseña" rules={[{ required: true, message: 'Obligatorio' }]}>
                  <AntInput.Password placeholder="Contraseña" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="diasVigencia" label="Vigencia (días)" initialValue={30} rules={[{ required: true, message: 'Obligatorio' }]}>
                  <AntInput type="number" min={1} max={365} />
                </Form.Item>
              </Col>
            </Row>
          )}
          {editando && (
            <Form.Item name="diasVigencia" label="Vigencia (días)" rules={[{ required: true, message: 'Obligatorio' }]}>
              <AntInput type="number" min={1} max={365} />
            </Form.Item>
          )}
          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Usuarios;
