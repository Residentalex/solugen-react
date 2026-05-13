import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
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
    <div className="paces-login-bg">
      <div className="paces-login-brand">
        <div className="paces-login-brand-content">
          <GenesisLogo size={56} showText={false} />
          <h1>Bienvenido a Genesis</h1>
          <p>Sistema de gestión empresarial Solugen ERP</p>
        </div>
      </div>

      <div className="paces-login-form">
        <div className="paces-login-card">
          <div className="login-header">
            <GenesisLogo size={40} showText />
            <h2>Iniciar Sesión</h2>
            <p>Ingrese sus credenciales para acceder al sistema</p>
          </div>

          <Form layout="vertical" onFinish={handleSubmit}>
            {error && (
              <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} />
            )}

            <Form.Item label="Usuario" style={{ marginBottom: 20 }}>
              <Input
                prefix={<UserOutlined style={{ color: '#a2a3b7' }} />}
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="Ingrese su usuario"
                autoFocus
                size="large"
              />
            </Form.Item>

            <Form.Item label="Contraseña" style={{ marginBottom: 24 }}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#a2a3b7' }} />}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingrese su contraseña"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                style={{
                  height: 46,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6c5ffc, #9b8cff)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(108,95,252,0.35)',
                }}
              >
                Ingresar <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
