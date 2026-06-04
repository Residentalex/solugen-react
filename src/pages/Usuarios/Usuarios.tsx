import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, Tag, Button, Modal, Form, Input as AntInput, Switch, message, Space, Row, Col, Card, Typography, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { usuarioApi } from '../../api/usuarioApi';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<UsuarioDTO | null>(null);
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoDTO[]>([]);

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
    } catch {
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
    empleadoApi.obtenerTodos(SUCURSAL_SEGURIDAD).then(setEmpleados).catch(() => {});
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      if (editando) {
        await usuarioApi.actualizar(SUCURSAL_SEGURIDAD, { ...editando, ...values });
        message.success('Usuario actualizado correctamente');
        setModalVisible(false);
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const pass = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const creado = await usuarioApi.crear(SUCURSAL_SEGURIDAD, { ...values, contrasena: pass, debeCambiarClave: true });
        Modal.success({
          title: 'Usuario creado',
          content: (
            <div>
              <p>Usuario creado correctamente.</p>
              <p><strong>Contraseña temporal:</strong> <code style={{ fontSize: 16 }}>{creado.contrasena || '(generada)'}</code></p>
            </div>
          ),
        });
        setModalVisible(false);
      }
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
        <Link to={`/MUsuario/${record.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        </Link>
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
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
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPage(1); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nuevo Usuario
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={() => { setLoadingError(false); setSearchText(''); cargarDatos(); }} />
          </div>
        </div>
        <Table<UsuarioDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 920 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="empleadoID" label="Empleado">
                <Select
                  showSearch
                  placeholder="Buscar empleado..."
                  allowClear
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={empleados.map(e => ({ label: `${e.codigo} - ${e.nombre}`, value: e.codigo }))}
                  onChange={(codigo) => {
                    if (!codigo) return;
                    const emp = empleados.find(e => e.codigo === codigo);
                    if (!emp) return;
                    form.setFieldValue('nombre', emp.nombre);
                    const partes = emp.nombre.trim().split(/\s+/);
                    const apellido = partes[0] || '';
                    const nombre = partes[partes.length - 1] || '';
                    form.setFieldValue('nombreUsuario', (nombre.charAt(0) + apellido).toUpperCase());
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="diasVigencia" label="Vigencia (días)" initialValue={30} rules={[{ required: true, message: 'Obligatorio' }]}>
                <AntInput type="number" min={1} max={365} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Usuarios;
