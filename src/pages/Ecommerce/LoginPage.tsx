import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const login = useEcommerceAuthStore((s) => s.login);
  const envioRef = useRef(false);

  const navegarSiLibre = (destino: string) => {
    if (envioRef.current) return;
    navigate(destino);
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    if (envioRef.current) return;
    envioRef.current = true;
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('¡Bienvenido de vuelta!');
      const returnUrl = sessionStorage.getItem('ecom_returnUrl');
      sessionStorage.removeItem('ecom_returnUrl');
      navigate(returnUrl || '/store');
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al iniciar sesión';
      message.error(msg);
    } finally {
      envioRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="store-auth-page">
      <div className="store-auth-container">
        <Card className="store-auth-card" bordered={false}>
          <div className="store-auth-logo" onClick={() => navegarSiLibre('/store')}>
            <div className="genesis-logo-box" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 24 }}>
              G
            </div>
            <Title level={3} style={{ margin: 0, color: 'var(--paces-text-heading)' }}>
              Genesis Store
            </Title>
          </div>

          <Title level={4} style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            Iniciar Sesión
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
            Ingresa tus datos para continuar
          </Text>

          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={handleSubmit}
            disabled={loading}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'El email es obligatorio' },
                { type: 'email', message: 'Ingresa un email válido' },
              ]}
            >
              <Input placeholder="ejemplo@correo.com" autoComplete="email" />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[{ required: true, message: 'La contraseña es obligatoria' }]}
            >
              <Input.Password placeholder="Tu contraseña" autoComplete="current-password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<LoginOutlined />}
                loading={loading}
                disabled={loading}
              >
                Iniciar Sesión
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              o
            </Text>
          </Divider>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">¿No tienes cuenta? </Text>
            <Link
              to="/store/registro"
              onClick={(e) => { if (envioRef.current) e.preventDefault(); }}
              style={{
                fontWeight: 600,
                pointerEvents: loading ? 'none' : 'auto',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Crear cuenta
            </Link>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navegarSiLibre('/store')}
            disabled={loading}
            style={{ color: 'var(--paces-text-secondary)' }}
          >
            Volver a la tienda
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
