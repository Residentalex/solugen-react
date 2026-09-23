import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/authApi';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { LockOutlined, WarningOutlined, CheckOutlined, ArrowRightOutlined } from '@ant-design/icons';
const { Text } = Typography;

const CambiarClave: React.FC = () => {
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [error, setError] = useState('');
  const [errorActual, setErrorActual] = useState('');
  const [errorNueva, setErrorNueva] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const usuario = useAuthStore((s) => s.usuario);
  const marcarClaveCambiada = useAuthStore((s) => s.marcarClaveCambiada);
  const navigate = useNavigate();

  const requisitos = [
    { label: 'Mínimo 6 caracteres', cumplido: claveNueva.length >= 6 },
    { label: 'No igual a la actual', cumplido: claveNueva.length > 0 && claveNueva !== claveActual },
    { label: 'Coincide con confirmación', cumplido: claveNueva.length > 0 && claveNueva === confirmarClave },
  ];

  const handleSubmit = async () => {
    setError('');
    setErrorActual('');
    setErrorNueva('');
    setErrorConfirmar('');

    if (!claveActual || !claveNueva || !confirmarClave) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (claveNueva.length < 6) {
      setErrorNueva('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (claveNueva !== confirmarClave) {
      setErrorConfirmar('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (claveActual === claveNueva) {
      setErrorNueva('La nueva contraseña no puede ser igual a la actual.');
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
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 2500);
    } catch (err: any) {
      const apiMsg = err.response?.data?.errorMessage || err.response?.data?.ErrorMessage;
      setError(apiMsg || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const validarActual = () => {
    if (!claveActual) setErrorActual('Ingrese su contraseña actual.');
    else setErrorActual('');
  };

  const validarNueva = (valor?: string) => {
    const val = valor !== undefined ? valor : claveNueva;
    if (!val) {
      setErrorNueva('Ingrese una nueva contraseña.');
      return;
    }
    if (val.length < 6) setErrorNueva('Mínimo 6 caracteres.');
    else if (val === claveActual) setErrorNueva('No puede ser igual a la actual.');
    else setErrorNueva('');
  };

  const validarConfirmar = (valor?: string) => {
    const val = valor !== undefined ? valor : confirmarClave;
    if (!val) {
      setErrorConfirmar('Confirme la nueva contraseña.');
      return;
    }
    if (claveNueva !== val) setErrorConfirmar('No coincide con la nueva contraseña.');
    else setErrorConfirmar('');
  };

  return (
    <div style={{ padding: '24px 24px 48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: '#111827' }}>Cambiar Contraseña</h2>
        <Text type="secondary" style={{ fontSize: 14, display: 'block', marginTop: 4 }}>
          Actualiza tu contraseña para mantener tu cuenta segura. Se recomienda usar una combinación de letras, números y símbolos.
        </Text>
      </div>

      <Card
        className="paces-card-erp"
        style={{ maxWidth: 520, margin: '0 auto', borderRadius: 14, boxShadow: '0 8px 28px -6px rgba(30,30,45,0.1)', padding: '8px 4px' }}
      >
        <div style={{ padding: '0 8px' }}>
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8f9fb', borderRadius: 8, border: '1px solid #e2e5ec' }}>
          <Text strong style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 6 }}>Requisitos de contraseña</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {requisitos.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: r.cumplido ? '#10b981' : '#6b7280' }}>
                {r.cumplido ? <CheckOutlined style={{ fontSize: 12 }} /> : <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid #c4c4d4', display: 'inline-block' }} />}
                <span style={{ fontWeight: r.cumplido ? 600 : 400 }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Indicador progresivo de fortaleza */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
            <span>Fortaleza</span>
            <span style={{ fontWeight: 600, color: requisitos.filter(r => r.cumplido).length >= 3 ? '#10b981' : requisitos.filter(r => r.cumplido).length >= 2 ? '#d48806' : requisitos.filter(r => r.cumplido).length >= 1 ? '#6b7280' : '#9ca3af' }}>
              {requisitos.filter(r => r.cumplido).length >= 3 ? 'Fuerte' : requisitos.filter(r => r.cumplido).length >= 2 ? 'Moderada' : requisitos.filter(r => r.cumplido).length >= 1 ? 'Débil' : 'Muy débil'}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.round((requisitos.filter(r => r.cumplido).length / requisitos.length) * 100)}%`,
              height: '100%',
              borderRadius: 3,
              background: requisitos.filter(r => r.cumplido).length >= 3 ? '#10b981' : requisitos.filter(r => r.cumplido).length >= 2 ? '#d48806' : '#6b7280',
              transition: 'width 300ms ease, background 300ms ease',
            }} />
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 40, color: '#556ee6', marginBottom: 12 }}>
              <CheckOutlined />
            </div>
            <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 8 }}>Contraseña actualizada</Text>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 16 }}>
              Serás redirigido al sistema en unos segundos.
            </Text>
            <Button type="primary" onClick={() => navigate('/', { replace: true })}>
              Ir al inicio <ArrowRightOutlined />
            </Button>
          </div>
        ) : (
          <Form layout="vertical" onFinish={handleSubmit}>
            {error && (
              <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
            )}

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8 }}>Contraseña actual</Text>
              <Form.Item label={null} style={{ marginBottom: 4 }} validateStatus={errorActual ? 'error' : ''} help={errorActual || ''}>
                <Input.Password
                  prefix={<LockOutlined />}
                  value={claveActual}
                  onChange={(e) => { setClaveActual(e.target.value); setErrorActual(''); }}
                  onBlur={validarActual}
                  placeholder="Contraseña actual"
                  autoFocus
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </div>

            <div style={{ borderTop: '1px solid #e2e5ec', marginBottom: 20, paddingTop: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#111827', display: 'block', marginBottom: 8, marginTop: 8 }}>Nueva contraseña</Text>
              <Form.Item label={null} style={{ marginBottom: 4 }} validateStatus={errorNueva ? 'error' : ''} help={errorNueva || ''}>
                <Input.Password
                  prefix={<LockOutlined />}
                  value={claveNueva}
                  onChange={(e) => { setClaveNueva(e.target.value); validarNueva(e.target.value); }}
                  onBlur={(e) => validarNueva((e.target as HTMLInputElement).value)}
                  placeholder="Nueva contraseña"
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
              <Form.Item label={null} style={{ marginBottom: 4 }} validateStatus={errorConfirmar ? 'error' : ''} help={errorConfirmar || ''}>
                <Input.Password
                  prefix={<LockOutlined />}
                  value={confirmarClave}
                  onChange={(e) => { setConfirmarClave(e.target.value); validarConfirmar(e.target.value); }}
                  onBlur={(e) => validarConfirmar((e.target as HTMLInputElement).value)}
                  placeholder="Confirmar nueva contraseña"
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </div>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="login-submit-btn"
                style={{ height: 46, fontSize: 15, fontWeight: 600, borderRadius: 10 }}
              >
                <span className="btn-content">
                  Cambiar Contraseña <ArrowRightOutlined />
                </span>
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Button
                type="default"
                size="small"
                onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
                style={{ color: '#6b7280', borderRadius: 6 }}
              >
                Cerrar sesión
              </Button>
            </div>
          </Form>
        )}
        </div>
      </Card>
    </div>
  );
};

export default CambiarClave;
