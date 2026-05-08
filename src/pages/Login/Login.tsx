import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { Form, Input, Button, Card, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import GenesisLogo from '../../components/GenesisLogo';

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const Login: React.FC = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const getEquipo = (): string => {
    return typeof navigator !== 'undefined'
      ? (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown'
      : 'Unknown';
  };

  const getIP = async (): Promise<string> => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || '127.0.0.1';
    } catch {
      return '127.0.0.1';
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!nombreUsuario.trim() || !contrasena.trim()) {
      setError('Los campos de Usuario y Contraseña no pueden estar vacíos.');
      return;
    }

    setLoading(true);
    try {
      const equipo = getEquipo();
      const ip = await getIP();

      await login({
        nombreUsuario: nombreUsuario.trim().toUpperCase(),
        contrasena,
        equipo,
        ip,
        sucursal: SUCURSAL_SEGURIDAD,
      });

      const usuario = useAuthStore.getState().usuario;
      if (usuario?.debeCambiarClave) {
        navigate('/cambiar-clave', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const apiMsg = err.response?.data?.errorMessage || err.response?.data?.ErrorMessage;
      setError(apiMsg || err.message || 'Usuario o contraseña inválida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, padding: '24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <GenesisLogo size={40} color="#1890ff" />
        </div>

        <Form layout="vertical" style={{ padding: '0 24px' }} onFinish={handleSubmit}>
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          )}

          <Form.Item label="Usuario">
            <Input
              prefix={<UserOutlined />}
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="Usuario"
              autoFocus
            />
          </Form.Item>

          <Form.Item label="Contraseña">
            <Input.Password
              prefix={<LockOutlined />}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Contraseña"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              Ingresar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
