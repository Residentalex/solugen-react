import React from 'react';
import { Card, Table, Tag, Typography, Empty, Space, Skeleton } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { formatDate, formatCurrency, toTitleCase } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;

export interface CobrosCardProps {
  cobros: any[];
  readOnly?: boolean;
  loading?: boolean;
  scrollX?: number;
  emptyText?: string;
}

const CobrosCard: React.FC<CobrosCardProps> = ({
  cobros = [],
  readOnly = true,
  loading = false,
  scrollX,
  emptyText,
}) => {
  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => (v ? formatDate(v) : '-'),
    },
    {
      title: 'Medio Cobro',
      dataIndex: 'medioCobro',
      key: 'medioCobro',
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatCurrency(v ?? 0)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (v: number) => {
        const info = ESTADO_DOCUMENTO_MAP[v] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 3 }} />;
    }

    if (cobros.length === 0) {
      return (
        <Empty
          image={<DollarOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
          imageStyle={{ height: 40 }}
          description={
            <span className="paces-text-secondary" style={{ fontSize: 13 }}>
              {emptyText || 'Sin cobros registrados'}
            </span>
          }
        />
      );
    }

    return (
      <Table
        dataSource={cobros}
        rowKey={(r: any) => r.id || r.index || Math.random()}
        size="small"
        pagination={false}
        scroll={{ x: scrollX || 500 }}
        columns={columns}
      />
    );
  };

  return (
    <Card
      className="paces-card"
      size="small"
      title={
        <Space size={8}>
          <DollarOutlined style={{ color: '#556ee6' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Cobros</span>
        </Space>
      }
    >
      {renderContent()}
    </Card>
  );
};

export default CobrosCard;
