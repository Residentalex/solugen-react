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
    return '127.0.0.1';
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
            <div className="genesis-logo-wrapper">
              <GenesisLogo size={40} showText />
            </div>
            <h2>Iniciar Sesión</h2>
            <p>Ingrese sus credenciales para acceder al sistema</p>
          </div>

          <Form layout="vertical" onFinish={handleSubmit}>
            {error && (
              <Alert message={error} type="error" showIcon className="login-alert" />
            )}

            <Form.Item label="Usuario" style={{ marginBottom: 18 }}>
              <Input
                prefix={<UserOutlined />}
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="Ej: JUAN.PEREZ"
                autoFocus
                size="large"
              />
            </Form.Item>

            <Form.Item label="Contraseña" style={{ marginBottom: 22 }}>
              <Input.Password
                prefix={<LockOutlined />}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Su contraseña"
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
                className="login-submit-btn"
                style={{
                  height: 46,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 10,
                }}
              >
                <span className="btn-content">
                  Ingresar <ArrowRightOutlined />
                </span>
              </Button>
            </Form.Item>

            <a className="login-recovery">¿Olvidó su contraseña?</a>

            <div className="login-footer">Genesis ERP · © 2026 Solugen</div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;
