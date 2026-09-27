import React from 'react';
import { Typography, Tooltip } from 'antd';

const { Text } = Typography;

interface TiempoEjecucionCellProps {
  value: number | null;
  esSecundaria?: boolean;
}

function formatTiempo(seg: number | null): string {
  if (seg === null || seg === undefined) return '—';
  return `${seg.toFixed(1)}s`;
}

export const TiempoEjecucionCell: React.FC<TiempoEjecucionCellProps> = ({
  value,
  esSecundaria = true,
}) => {
  if (value === null || value === undefined) {
    return <Text className="paces-text-secondary">—</Text>;
  }

  const formatted = formatTiempo(value);

  return (
    <Tooltip title={`Tiempo total: ${formatted}`}>
      <Text className="paces-text-secondary" style={{ fontSize: 12 }}>
        {formatted}
      </Text>
    </Tooltip>
  );
};