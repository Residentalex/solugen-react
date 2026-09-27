import React from 'react';
import { Badge, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface EstadoActualBadgeProps {
  estado: string;
  textoAmigable?: string;
  onClick?: () => void;
  esCeldaTabla?: boolean;
}

const ESTADO_BADGE_MAP: Record<string, { status: 'success' | 'error' | 'processing' | 'default'; text: string }> = {
  Exitoso: { status: 'success', text: 'Exitoso' },
  Fallido: { status: 'error', text: 'Fallido' },
  Ejecutando: { status: 'processing', text: 'Ejecutando' },
  NuncaEjecutado: { status: 'default', text: 'Nunca ejecutado' },
};

export const EstadoActualBadge: React.FC<EstadoActualBadgeProps> = ({
  estado,
  textoAmigable,
  onClick,
  esCeldaTabla = false,
}) => {
  const info = ESTADO_BADGE_MAP[estado] || { status: 'default', text: estado };
  const displayText = textoAmigable || info.text;

  const badgeStyle: React.CSSProperties = {
    marginRight: 8,
    fontSize: esCeldaTabla ? 14 : 10,
  };

  const textStyle: React.CSSProperties = {
    fontSize: esCeldaTabla ? 13 : 11,
    fontWeight: esCeldaTabla ? 600 : 500,
    color: esCeldaTabla ? 'inherit' : 'var(--paces-text-primary)',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    cursor: onClick ? 'pointer' : 'default',
    padding: esCeldaTabla ? '4px 8px' : 0,
    borderRadius: esCeldaTabla ? 4 : 0,
    transition: 'background 0.2s',
  };

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.background = 'var(--paces-row-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <Badge status={info.status} style={badgeStyle} />
      <Text style={textStyle}>{displayText}</Text>
    </div>
  );
};