import React from 'react';
import { Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { formatDateRaw } from '../utils/formats';

const { Text } = Typography;

interface FechaColumnCellProps {
  fecha: string;
  fechaSecundaria?: string;
  labelSecundario?: string;
  size?: 'small' | 'middle';
}

const FechaColumnCell: React.FC<FechaColumnCellProps> = ({
  fecha,
  fechaSecundaria,
  labelSecundario = 'Recibo',
  size = 'middle',
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.35 }}>
      <CalendarOutlined
        style={{
          color: 'var(--paces-primary)',
          fontSize: 14,
          marginTop: 1,
          flexShrink: 0,
          lineHeight: '18px',
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: size === 'small' ? 10 : 11,
            fontWeight: 600,
            color: 'var(--paces-text-heading)',
          }}
        >
          {formatDateRaw(fecha)}
        </div>
        {fechaSecundaria && (
          <div
            className="paces-text-secondary"
            style={{ fontSize: 9, marginTop: 1, lineHeight: 1.2 }}
          >
            {labelSecundario}: {formatDateRaw(fechaSecundaria)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FechaColumnCell;
