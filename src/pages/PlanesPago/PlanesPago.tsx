import React, { useEffect } from 'react';
import { Card, Typography } from 'antd';
import { useUIStore } from '../../stores/uiStore';

const { Title, Text } = Typography;

const PlanesPago: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useEffect(() => {
    setActiveModule('MPlanPago');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card className="paces-card-erp" style={{ textAlign: 'center', borderRadius: 8, padding: 48, maxWidth: 500 }}>
        <Title level={2} type="secondary" style={{ marginBottom: 8 }}>
          🚧 Próximamente
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          La pantalla de Planes de Pago estará disponible en una próxima actualización.
        </Text>
      </Card>
    </div>
  );
};

export default PlanesPago;
