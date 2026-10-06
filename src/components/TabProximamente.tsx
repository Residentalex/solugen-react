import React from 'react';
import { Card, Typography, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TabProximamenteProps {
  titulo: string;
  descripcion: string;
}

/**
 * Placeholder unico para tabs de informacion que aun no tienen implementacion.
 * Se usa en Modulo de Clientes y en Modulo de Proveedores para no duplicar el
 * mismo bloque "Funcion en desarrollo" en varias pantallas.
 */
const TabProximamente: React.FC<TabProximamenteProps> = ({ titulo, descripcion }) => {
  return (
    <Card className="paces-card">
      <div style={{ textAlign: 'center', padding: 48 }} className="paces-text-secondary">
        <Tag color="warning" icon={<ClockCircleOutlined />} style={{ marginBottom: 16 }}>
          Funcion en desarrollo
        </Tag>
        <Text type="secondary" style={{ fontSize: 16 }}>
          {titulo} — Próximamente
        </Text>
        <br />
        <Text type="secondary">
          {descripcion}
        </Text>
      </div>
    </Card>
  );
};

export default TabProximamente;