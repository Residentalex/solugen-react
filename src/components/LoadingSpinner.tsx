import React from 'react';
import { Spin } from 'antd';

interface LoadingSpinnerProps {
  mensaje?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ mensaje = 'Cargando...' }) => (
  <div style={{ textAlign: 'center', padding: 80 }}>
    <Spin size="large" />
    <div style={{ marginTop: 16 }} className="paces-text-secondary">{mensaje}</div>
  </div>
);

export default LoadingSpinner;
