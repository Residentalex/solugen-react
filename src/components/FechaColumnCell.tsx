import React from 'react';
import { Typography, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { formatDateRaw, formatDateShort } from '../utils/formats';

const { Text } = Typography;

interface FechaColumnCellProps {
  fecha: string;
  fechaSecundaria?: string;
  labelSecundario?: string;
  labelSecundarioTitle?: string;
  secundariaCompacta?: boolean;
  size?: 'small' | 'middle';
}

const FechaColumnCell: React.FC<FechaColumnCellProps> = ({
  fecha,
  fechaSecundaria,
  labelSecundario = 'Recibo',
  labelSecundarioTitle,
  secundariaCompacta = false,
  size = 'middle',
}) => {
  const secundariaTexto = fechaSecundaria
    ? secundariaCompacta
      ? `${labelSecundario} ${formatDateShort(fechaSecundaria)}`
      : `${labelSecundario}: ${formatDateRaw(fechaSecundaria)}`
    : '';
  const secundariaTitle = `${labelSecundarioTitle ?? labelSecundario}: ${formatDateRaw(fechaSecundaria ?? '')}`;

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
          <Tooltip title={secundariaTitle} mouseEnterDelay={0.3}>
            <div
              className="paces-text-secondary"
              style={{ fontSize: 11, marginTop: 1, lineHeight: 1.2, whiteSpace: 'nowrap' }}
            >
              {secundariaTexto}
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default FechaColumnCell;
