import React from 'react';
import { Table, Tag, Tooltip, Empty, Typography } from 'antd';
import { toTitleCase } from '../utils/formats';
import { formatNumber } from '../utils/contabilidad';

const { Text } = Typography;

const columns = [
  {
    title: 'Código',
    key: 'codigo',
    width: 100,
    fixed: 'left' as const,
    onCell: () => ({ style: { verticalAlign: 'top' } }),
    render: (_: any, record: any) => (
      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <span>{record.codigo || '-'}</span>
        {record.referencia && (
          <Tooltip title={record.referencia}>
            <div
              className="paces-text-secondary"
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                marginTop: 'auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'left',
              }}
            >
              {record.referencia}
            </div>
          </Tooltip>
        )}
      </div>
    ),
  },
  {
    title: 'Artículo',
    key: 'articulo',
    ellipsis: true,
    onCell: () => ({ style: { verticalAlign: 'top' } }),
    render: (_: any, record: any) => (
      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <span>{toTitleCase(record.articulo || '')}</span>
        <div
          className="paces-text-secondary"
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'auto',
          }}
        >
          {record.familia?.nombre ? (
            <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
              {toTitleCase(record.familia.nombre)}
            </Tag>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    title: 'Cantidad',
    dataIndex: 'cantidad',
    key: 'cantidad',
    width: 100,
    align: 'right' as const,
    render: (val: number) => formatNumber(val || 0),
  },
  {
    title: 'Costo',
    dataIndex: 'costo',
    key: 'costo',
    width: 110,
    align: 'right' as const,
    responsive: ['md' as const],
    render: (val: number) => formatNumber(val || 0),
  },
  {
    title: 'SubTotal',
    dataIndex: 'subTotal',
    key: 'subTotal',
    width: 110,
    align: 'right' as const,
    responsive: ['lg' as const],
    render: (val: number) => formatNumber(val || 0),
  },
  {
    title: 'Descuento',
    dataIndex: 'descuento',
    key: 'descuento',
    width: 100,
    align: 'right' as const,
    responsive: ['lg' as const],
    render: (val: number) => formatNumber(val || 0),
  },
  {
    title: 'Impuestos',
    dataIndex: 'impuestos',
    key: 'impuestos',
    width: 120,
    align: 'right' as const,
    responsive: ['lg' as const],
    render: (val: number) => formatNumber(val || 0),
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    width: 110,
    align: 'right' as const,
    render: (val: number) => <Text strong>{formatNumber(val || 0)}</Text>,
  },
];

interface DetalleMovimientoTableProps {
  detalles: any[];
  scroll?: { x?: number };
  rowKey?: string | ((record: any) => string);
}

const DetalleMovimientoTable: React.FC<DetalleMovimientoTableProps> = ({ detalles, scroll, rowKey }) => (
  <Table
    dataSource={detalles || []}
    columns={columns}
    rowKey={rowKey || 'id'}
    size="small"
    pagination={false}
    scroll={scroll || { x: 1000 }}
    locale={{
      emptyText: (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Sin detalles de movimiento"
          style={{ padding: '24px 0' }}
        />
      ),
    }}
  />
);

export default DetalleMovimientoTable;
