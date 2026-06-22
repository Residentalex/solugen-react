import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Descriptions,
  Modal,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  LockOutlined,
  ShoppingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PerfilPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [formClave] = Form.useForm();

  const usuario = useEcommerceAuthStore((s) => s.usuario);
  const isAuthenticated = useEcommerceAuthStore((s) => s.isAuthenticated);
  const cargarPerfil = useEcommerceAuthStore((s) => s.cargarPerfil);
  const actualizarPerfil = useEcommerceAuthStore((s) => s.actualizarPerfil);
  const cambiarClave = useEcommerceAuthStore((s) => s.cambiarClave);
  const logout = useEcommerceAuthStore((s) => s.logout);

  const [editando, setEditando] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [modalClaveOpen, setModalClaveOpen] = useState(false);
  const [loadingClave, setLoadingClave] = useState(false);

  // Cargar perfil al montar
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingPerfil(true);
      cargarPerfil().finally(() => setLoadingPerfil(false));
    }
  }, [isAuthenticated, cargarPerfil]);

  // Sincronizar formulario cuando cambia el usuario
  useEffect(() => {
    if (usuario) {
      form.setFieldsValue({
        nombre: usuario.nombre,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
      });
    }
  }, [usuario, form]);

  const handleGuardar = async (values: { nombre: string; telefono: string; direccion: string }) => {
    setLoadingGuardar(true);
    try {
      await actualizarPerfil(values);
      setEditando(false);
    } catch {
      // Error ya manejado en el store
    } finally {
      setLoadingGuardar(false);
    }
  };

  const handleCambiarClave = async (values: {
    passwordActual: string;
    passwordNueva: string;
    confirmarPasswordNueva: string;
  }) => {
    if (values.passwordNueva !== values.confirmarPasswordNueva) {
      message.error('Las contraseÃ±as no coinciden');
      return;
    }
    if (values.passwordNueva.length < 6) {
      message.error('La contraseÃ±a nueva debe tener al menos 6 caracteres');
      return;
    }

    setLoadingClave(true);
    try {
      await cambiarClave({
        passwordActual: values.passwordActual,
        passwordNueva: values.passwordNueva,
      });
      setModalClaveOpen(false);
      formClave.resetFields();
    } catch {
      // Error ya manejado en el store
    } finally {
      setLoadingClave(false);
    }
  };

  const handleLogout = () => {
    logout();
    message.info('SesiÃ³n cerrada');
    navigate('/store');
  };

  // Proteger ruta: redirigir a login si no estÃ¡ autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/store/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (loadingPerfil) {
    return (
      <div className="store-auth-page">
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="store-auth-page">
      <div className="store-perfil-container">
        <div style={{ marginBottom: 24 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/store')}>
            Volver a la tienda
          </Button>
        </div>

        <Title level={3} style={{ marginBottom: 24 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          Mi Perfil
        </Title>

        <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            InformaciÃ³n de la cuenta
          </Title>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Nombre">{usuario?.nombre || '-'}</Descriptions.Item>
            <Descriptions.Item label="Email">{usuario?.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="TelÃ©fono">{usuario?.telefono || '-'}</Descriptions.Item>
            <Descriptions.Item label="DirecciÃ³n">{usuario?.direccion || '-'}</Descriptions.Item>
            <Descriptions.Item label="Fecha de registro">
              {usuario?.fechaRegistro
                ? new Date(usuario.fechaRegistro).toLocaleDateString('es-DO')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <Title level={5} style={{ margin: 0 }}>
              <EditOutlined style={{ marginRight: 8 }} />
              Editar perfil
            </Title>
            {!editando && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => setEditando(true)}>
                Editar
              </Button>
            )}
          </div>

          {editando ? (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGuardar}
              initialValues={{
                nombre: usuario?.nombre,
                telefono: usuario?.telefono,
                direccion: usuario?.direccion,
              }}
            >
              <Form.Item
                label="Nombre"
                name="nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Tu nombre completo" />
              </Form.Item>

              <Form.Item
                label="TelÃ©fono"
                name="telefono"
                rules={[{ required: true, message: 'El telÃ©fono es obligatorio' }]}
              >
                <Input placeholder="Ej. 809-555-1234" />
              </Form.Item>

              <Form.Item
                label="DirecciÃ³n"
                name="direccion"
                rules={[{ required: true, message: 'La direcciÃ³n es obligatoria' }]}
              >
                <TextArea rows={3} placeholder="Calle, nÃºmero, sector, ciudad..." />
              </Form.Item>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={() => setEditando(false)}>Cancelar</Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loadingGuardar}>
                  Guardar cambios
                </Button>
              </div>
            </Form>
          ) : (
            <Text type="secondary">Haz clic en Editar para modificar tus datos.</Text>
          )}
        </Card>

        <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            Acciones
          </Title>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button icon={<ShoppingOutlined />} onClick={() => navigate('/store/ordenes')}>
              Mis Pedidos
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setModalClaveOpen(true)}>
              Cambiar contraseÃ±a
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
              Cerrar sesiÃ³n
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal cambiar contraseÃ±a */}
      <Modal
        title="Cambiar contraseÃ±a"
        open={modalClaveOpen}
        onCancel={() => {
          setModalClaveOpen(false);
          formClave.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={formClave}
          layout="vertical"
          onFinish={handleCambiarClave}
          autoComplete="off"
        >
          <Form.Item
            label="ContraseÃ±a actual"
            name="passwordActual"
            rules={[{ required: true, message: 'Ingresa tu contraseÃ±a actual' }]}
          >
            <Input.Password placeholder="ContraseÃ±a actual" />
          </Form.Item>

          <Form.Item
            label="Nueva contraseÃ±a"
            name="passwordNueva"
            rules={[
              { required: true, message: 'Ingresa la nueva contraseÃ±a' },
              { min: 6, message: 'MÃ­nimo 6 caracteres' },
            ]}
          >
            <Input.Password placeholder="MÃ­nimo 6 caracteres" />
          </Form.Item>

          <Form.Item
            label="Confirmar nueva contraseÃ±a"
            name="confirmarPasswordNueva"
            rules={[
              { required: true, message: 'Confirma la nueva contraseÃ±a' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('passwordNueva') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseÃ±as no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repite la nueva contraseÃ±a" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setModalClaveOpen(false);
                formClave.resetFields();
              }}
            >
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" loading={loadingClave}>
              Cambiar contraseÃ±a
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PerfilPage;
