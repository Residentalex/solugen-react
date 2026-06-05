import React from 'react';
import { Button, Space } from 'antd';
import { CloseCircleOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface Props {
  mensaje?: string;
  rutaVolver?: string;
  onRecargar?: () => void;
}

const ErrorDetalle: React.FC<Props> = ({ 
  mensaje = 'Error al cargar el documento',
  rutaVolver = '/',
  onRecargar,
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
      <Space style={{ marginTop: 24 }}>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(rutaVolver)}
        >
          Volver al listado
        </Button>
        {onRecargar && (
          <Button icon={<ReloadOutlined />} onClick={onRecargar} />
        )}
      </Space>
    </div>
  );
};

export default ErrorDetalle;
