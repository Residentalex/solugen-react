import React from 'react';
import { Card, Typography, Empty, Space, Skeleton } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { formatDate } from '../../utils/formats';

const { Text } = Typography;

export interface NotaSeguimientoItem {
  id: number;
  fecha?: string;
  nota?: string;
  usuario?: string;
}

export interface NotasSeguimientoCardProps {
  notas: NotaSeguimientoItem[];
  readOnly?: boolean;
  loading?: boolean;
  emptyText?: string;
}

const NotasSeguimientoCard: React.FC<NotasSeguimientoCardProps> = ({
  notas = [],
  readOnly = true,
  loading = false,
  emptyText,
}) => {
  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 3 }} />;
    }

    if (notas.length === 0) {
      return (
        <Empty
          image={<FileTextOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
          imageStyle={{ height: 40 }}
          description={
            <span className="paces-text-secondary" style={{ fontSize: 13 }}>
              {emptyText || 'Sin notas de seguimiento'}
            </span>
          }
        />
      );
    }

    return (
      <div>
        {notas.map((n) => (
          <div
            key={n.id}
            style={{
              marginBottom: 12,
              padding: '8px 12px',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>
                {n.usuario || '-'}
              </Text>
              <Text className="paces-text-secondary" style={{ fontSize: 11 }}>
                {n.fecha ? formatDate(n.fecha) : '-'}
              </Text>
            </div>
            <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
              {n.nota || '-'}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card
      className="paces-card"
      size="small"
      title={
        <Space size={8}>
          <FileTextOutlined style={{ color: '#556ee6' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Notas de Seguimiento</span>
        </Space>
      }
    >
      {renderContent()}
    </Card>
  );
};

export default NotasSeguimientoCard;
