import React from 'react';
import { Button } from 'antd';
import { CloseCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface Props {
  mensaje?: string;
  rutaVolver?: string;
}

const ErrorDetalle: React.FC<Props> = ({ 
  mensaje = 'Error al cargar el documento',
  rutaVolver = '/'
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
      <div style={{ marginTop: 16, fontSize: 16, color: '#ff4d4f' }}>
        {mensaje}
      </div>
      <div style={{ marginTop: 8 }} className="paces-text-secondary">
        Verifique que el documento exista en la sucursal seleccionada.
      </div>
      <Button 
        type="primary" 
        icon={<ArrowLeftOutlined />} 
        style={{ marginTop: 24 }} 
        onClick={() => navigate(rutaVolver)}
      >
        Volver al listado
      </Button>
    </div>
  );
};

export default ErrorDetalle;
