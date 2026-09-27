import React from 'react';
import { Badge, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface KPICardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  variant: 'primary' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
  active?: boolean;
  trend?: { value: number | string; label: string };
}

export const KPICard: React.FC<KPICardProps> = ({
  icon,
  value,
  label,
  variant = 'primary',
  onClick,
  active = false,
  trend,
}) => {
  const colorMap: Record<string, string> = {
    primary: 'var(--paces-primary)',
    success: '#34c38f',
    danger: '#f46a6a',
    warning: '#f0b345',
  };

  const bgOverlay = `${colorMap[variant]}15`;
  const borderColor = colorMap[variant];

  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        cursor: 'pointer',
        borderRight: '1px solid var(--paces-border)',
        borderTop: active ? `2px solid ${borderColor}` : '2px solid transparent',
        background: active ? bgOverlay : 'transparent',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--paces-row-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgOverlay,
          color: colorMap[variant],
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--paces-text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </div>
      {trend && (
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--paces-text-secondary)',
          }}
        >
          {trend.label}: {trend.value}
        </div>
      )}
    </div>
  );
};