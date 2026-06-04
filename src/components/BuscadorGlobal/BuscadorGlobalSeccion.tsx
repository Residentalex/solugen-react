import React from 'react';
import { Tag } from 'antd';

export interface BuscadorGlobalSeccionProps {
  icono: string;
  nombre: string;
  contador: number;
  children: React.ReactNode;
}

const BuscadorGlobalSeccion: React.FC<BuscadorGlobalSeccionProps> = ({
  icono,
  nombre,
  contador,
  children,
}) => {
  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          padding: '0 4px',
        }}
      >
        <span style={{ fontSize: 16 }}>{icono}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--paces-text)' }}>
          {nombre}
        </span>
        <Tag color="default" style={{ fontSize: 11, lineHeight: '18px', borderRadius: 4 }}>
          {contador}
        </Tag>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default BuscadorGlobalSeccion;
