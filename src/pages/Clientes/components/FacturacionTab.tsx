import React from 'react';
import { Card, Typography, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const FacturacionTab: React.FC = () => {
  return (
    <Card className="paces-card">
      <div style={{ textAlign: 'center', padding: 48 }} className="paces-text-secondary">
        <Tag color="warning" icon={<ClockCircleOutlined />} style={{ marginBottom: 16 }}>
          Función en desarrollo
        </Tag>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Historial de Facturación — Próximamente
        </Text>
        <br />
        <Text type="secondary">
          Aquí se mostrarán las facturas del cliente con su detalle, fechas de emisión, montos y estados.
        </Text>
      </div>
    </Card>
  );
};

export default FacturacionTab;
