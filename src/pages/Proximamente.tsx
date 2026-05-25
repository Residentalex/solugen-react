import React, { useEffect } from 'react';
import { Card, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores/uiStore';

const { Title, Text } = Typography;

interface ProximamenteProps {
  modulo: string;
  codigo: string;
}

const Proximamente: React.FC<ProximamenteProps> = ({ modulo, codigo }) => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  useEffect(() => {
    setActiveModule(codigo);
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, codigo]);

  return (
    <Card
      className="paces-card-erp"
      style={{
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
      }}
      styles={{ body: { width: '100%', textAlign: 'center', padding: '60px 24px' } }}
    >
      <ClockCircleOutlined style={{ fontSize: 64, color: '#556ee6', marginBottom: 24 }} />
      <Title level={3}>{modulo}</Title>
      <Text style={{ fontSize: 16, color: '#888' }}>
        Esta funcionalidad estará disponible próximamente.
      </Text>
    </Card>
  );
};

export default Proximamente;
