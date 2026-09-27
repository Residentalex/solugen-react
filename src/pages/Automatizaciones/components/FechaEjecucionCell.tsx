import React from 'react';
import { Typography, Tooltip } from 'antd';

const { Text } = Typography;

interface FechaEjecucionCellProps {
  value: string | null;
  label: string;
  esSecundaria?: boolean;
  showTooltip?: boolean;
}

function formatFechaCorta(val: string | null): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return val;
  }
}

export const FechaEjecucionCell: React.FC<FechaEjecucionCellProps> = ({
  value,
  label,
  esSecundaria = false,
  showTooltip = true,
}) => {
  const formatted = formatFechaCorta(value);
  const content = (
    <Text
      className={esSecundaria ? 'paces-text-secondary' : undefined}
      style={
        esSecundaria
          ? undefined
          : {
              fontWeight: 600,
              fontSize: 13,
            }
      }
    >
      {formatted}
    </Text>
  );

  if (!showTooltip || !value) return content;

  return (
    <Tooltip title={label}>
      <span>{content}</span>
    </Tooltip>
  );
};