import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/authApi';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { LockOutlined, WarningOutlined } from '@ant-design/icons';
import GenesisLogo from '../../components/GenesisLogo';

const { Text } = Typography;

const CambiarClave: React.FC = () => {
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usuario = useAuthStore((s) => s.usuario);
  const marcarClaveCambiada = useAuthStore((s) => s.marcarClaveCambiada);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');

    if (!claveActual || !claveNueva || !confirmarClave) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (claveNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (claveNueva !== confirmarClave) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (claveActual === claveNueva) {
      setError('La nueva contraseña no puede ser igual a la actual.');
      return;
    }

    setLoading(true);
    try {
      await authApi.cambiarClave({
        usuarioID: usuario!.id,
        claveActual,
        claveNueva,
      });

      marcarClaveCambiada();
      navigate('/', { replace: true });
    } catch (err: any) {
      const apiMsg = err.response?.data?.errorMessage || err.response?.data?.ErrorMessage;
      setError(apiMsg || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 420, padding: '24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <GenesisLogo size={40} color="#1890ff" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 24px' }}>
          <WarningOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
          <br />
          <Text strong style={{ fontSize: 16 }}>Debes cambiar tu contraseña</Text>
          <br />
          <Text type="secondary">Por seguridad, debes establecer una nueva contraseña para continuar.</Text>
        </div>

        <Form layout="vertical" style={{ padding: '0 24px' }} onFinish={handleSubmit}>
          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          )}

          <Form.Item label="Contraseña actual">
            <Input.Password
              prefix={<LockOutlined />}
              value={claveActual}
              onChange={(e) => setClaveActual(e.target.value)}
              placeholder="Contraseña actual"
              autoFocus
            />
          </Form.Item>

          <Form.Item label="Nueva contraseña">
            <Input.Password
              prefix={<LockOutlined />}
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              placeholder="Nueva contraseña"
            />
          </Form.Item>

          <Form.Item label="Confirmar nueva contraseña">
            <Input.Password
              prefix={<LockOutlined />}
              value={confirmarClave}
              onChange={(e) => setConfirmarClave(e.target.value)}
              placeholder="Confirmar nueva contraseña"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
              Cambiar Contraseña
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}>
              Cerrar sesión
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CambiarClave;
