import React from 'react';
import { Typography, Empty, Button, Space } from 'antd';
import type { ReactNode } from 'react';
import { InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  size?: 'small' | 'default' | 'large';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No se encontraron registros',
  description = 'Intenta ajustar los filtros o busca con otros términos.',
  icon,
  action,
  size = 'default',
}) => {
  return (
    <Empty
      image={icon ?? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <InboxOutlined style={{ fontSize: 48, color: 'var(--paces-text-secondary)' }} />
        </div>
      )}
      imageStyle={{ height: 80, marginBottom: 12 }}
      description={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <Text strong style={{ fontSize: 16, color: 'var(--paces-text-heading)' }}>
            {title}
          </Text>
          <Text className="paces-text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {description}
          </Text>
          {action && (
            <div style={{ marginTop: 8 }}>
              {action}
            </div>
          )}
        </div>
      )}
      style={{
        padding: size === 'small' ? 24 : size === 'large' ? 64 : 48,
        background: 'var(--paces-bg-container)',
        borderRadius: 8,
        border: '1px solid var(--paces-border)',
      }}
    />
  );
};

export default EmptyState;