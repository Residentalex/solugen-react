import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { ArrowLeftOutlined, UserAddOutlined } from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RegistroPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const registro = useEcommerceAuthStore((s) => s.registro);

  const handleSubmit = async (values: {
    nombre: string;
    email: string;
    password: string;
    confirmarPassword: string;
    telefono: string;
    direccion: string;
  }) => {
    if (values.password !== values.confirmarPassword) {
      message.error('Las contraseñas no coinciden');
      return;
    }
    if (values.password.length < 6) {
      message.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await registro({
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        telefono: values.telefono,
        direccion: values.direccion,
      });
      message.success('¡Cuenta creada exitosamente!');
      navigate('/store');
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al crear la cuenta';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-auth-page">
      <div className="store-auth-container">
        <Card className="store-auth-card" bordered={false}>
          <div className="store-auth-logo" onClick={() => navigate('/store')}>
            <div className="genesis-logo-box" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 24 }}>
              G
            </div>
            <Title level={3} style={{ margin: 0, color: 'var(--paces-text-heading)' }}>
              Genesis Store
            </Title>
          </div>

          <Title level={4} style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            Crear Cuenta
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            Regístrate para comprar más rápido
          </Text>

          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              label="Nombre completo"
              name="nombre"
              rules={[{ required: true, message: 'El nombre es obligatorio' }]}
            >
              <Input placeholder="Ej. Juan Pérez" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'El email es obligatorio' },
                { type: 'email', message: 'Ingresa un email válido' },
              ]}
            >
              <Input placeholder="ejemplo@correo.com" />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[
                { required: true, message: 'La contraseña es obligatoria' },
                { min: 6, message: 'Mínimo 6 caracteres' },
              ]}
            >
              <Input.Password placeholder="Mínimo 6 caracteres" />
            </Form.Item>

            <Form.Item
              label="Confirmar contraseña"
              name="confirmarPassword"
              rules={[
                { required: true, message: 'Confirma tu contraseña' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Las contraseñas no coinciden'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Repite tu contraseña" />
            </Form.Item>

            <Form.Item
              label="Teléfono"
              name="telefono"
              rules={[{ required: true, message: 'El teléfono es obligatorio' }]}
            >
              <Input placeholder="Ej. 809-555-1234" />
            </Form.Item>

            <Form.Item
              label="Dirección"
              name="direccion"
              rules={[{ required: true, message: 'La dirección es obligatoria' }]}
            >
              <TextArea rows={2} placeholder="Calle, número, sector, ciudad..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<UserAddOutlined />}
                loading={loading}
              >
                Crear Cuenta
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              o
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿Ya tienes cuenta? </Text>
            <Link to="/store/login" style={{ fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/store')}
            style={{ color: 'var(--paces-text-secondary)' }}
          >
            Volver a la tienda
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistroPage;
