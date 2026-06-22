import React from 'react';
import { Card, Typography } from 'antd';

const { Text } = Typography;

const MovimientosTab: React.FC = () => {
  return (
    <Card className="paces-card">
      <div style={{ textAlign: 'center', padding: 48 }} className="paces-text-secondary">
        <Text type="secondary" style={{ fontSize: 16 }}>
          Módulo de Movimientos - Próximamente
        </Text>
        <br />
        <Text type="secondary">
          Aquí se mostrarán las últimas transacciones del cliente.
        </Text>
      </div>
    </Card>
  );
};

export default MovimientosTab;
