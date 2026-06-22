import React from 'react';
import { Card, Typography } from 'antd';

const { Text } = Typography;

const FacturacionTab: React.FC = () => {
  return (
    <Card className="paces-card">
      <div style={{ textAlign: 'center', padding: 48 }} className="paces-text-secondary">
        <Text type="secondary" style={{ fontSize: 16 }}>
          Historial de Facturación - Próximamente
        </Text>
        <br />
        <Text type="secondary">
          Aquí se mostrarán las facturas del cliente con su detalle.
        </Text>
      </div>
    </Card>
  );
};

export default FacturacionTab;
