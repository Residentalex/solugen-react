import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SolicitudPagoFormulario: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 18, marginBottom: 16 }}>Solicitud de Pago</div>
      <div style={{ marginBottom: 24 }} className="paces-text-secondary">
        La creación y edición de solicitudes de pago estará disponible próximamente.
      </div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FSPA')}>
        Volver al listado
      </Button>
    </div>
  );
};

export default SolicitudPagoFormulario;
