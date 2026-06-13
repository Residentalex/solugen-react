import React from 'react';
import { Table, Tag, Tooltip, Empty } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { toTitleCase } from '../utils/formats';
import { formatNumber, esDebito, esCredito } from '../utils/contabilidad';

const columns = [
  {
    title: '#',
    key: 'index',
    width: 44,
    align: 'center' as const,
    render: (_: any, __: any, index: number) => (
      <span className="paces-text-secondary" style={{ fontSize: 11 }}>{index + 1}</span>
    ),
  },
  {
    title: 'Cuenta',
    key: 'cuenta',
    width: 120,
    render: (_: any, r: any) => r.cuentaContable?.noCuenta || '-',
  },
  {
    title: 'Nombre',
    key: 'nombre',
    render: (_: any, r: any) => (
      <div>
        <div style={{ fontSize: 13 }}>{toTitleCase(r.cuentaContable?.nombre || '-')}</div>
        {r.descripcion && (
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
            {r.descripcion}
          </div>
        )}
      </div>
    ),
  },
  {
    title: 'Débito',
    key: 'debito',
    width: 140,
    align: 'right' as const,
    render: (_: any, r: any) =>
      esDebito(r.tipoAsiento) ? (
        <Tooltip title={formatNumber(r.monto)} placement="left">
          <span style={{ color: '#f46a6a', fontWeight: 600 }}>{formatNumber(r.monto)}</span>
        </Tooltip>
      ) : null,
  },
  {
    title: 'Crédito',
    key: 'credito',
    width: 140,
    align: 'right' as const,
    render: (_: any, r: any) =>
      esCredito(r.tipoAsiento) ? (
        <Tooltip title={formatNumber(r.monto)} placement="left">
          <span style={{ color: '#34c38f', fontWeight: 600 }}>{formatNumber(r.monto)}</span>
        </Tooltip>
      ) : null,
  },
  {
    title: 'Generado',
    key: 'generado',
    width: 90,
    align: 'center' as const,
    render: (_: any, r: any) => (
      <Tag color={r.generado === false ? 'gold' : 'blue'} style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
        {r.generado === false ? 'Manual' : 'Auto'}
      </Tag>
    ),
  },
];

interface AsientosContableTableProps {
  asientos: any[];
  scroll?: { x?: number };
  rowKey?: string | ((record: any) => string);
}

const AsientosContableTable: React.FC<AsientosContableTableProps> = ({ asientos, scroll, rowKey }) => {
  const totalDebitos = (asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
  const diferencia = Math.abs(totalDebitos - totalCreditos);
  const esCuadrado = diferencia < 0.01;

  return (
    <Table
      dataSource={asientos || []}
      columns={columns}
      rowKey={rowKey || "id"}
      size="small"
      pagination={false}
      scroll={scroll || { x: 700 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Sin asientos contables"
            style={{ padding: '24px 0' }}
          />
        ),
      }}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} />
            <Table.Summary.Cell index={1} colSpan={2}>
              <strong>Totales</strong>
              {esCuadrado ? (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 12, fontSize: 11 }}>
                  Cuadrado
                </Tag>
              ) : (
                <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ marginLeft: 12, fontSize: 11 }}>
                  Diferencia: {formatNumber(diferencia)}
                </Tag>
              )}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <strong style={{ color: '#f46a6a' }}>{formatNumber(totalDebitos)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <strong style={{ color: '#34c38f' }}>{formatNumber(totalCreditos)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};

export default AsientosContableTable;
