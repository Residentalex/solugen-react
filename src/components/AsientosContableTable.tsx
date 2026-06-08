import React from 'react';
import { Table } from 'antd';
import { toTitleCase } from '../utils/formats';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

const columns = [
  {
    title: 'Cuenta',
    key: 'cuenta',
    width: 120,
    render: (_: any, r: any) => r.cuentaContable?.noCuenta || '-',
  },
  {
    title: 'Nombre',
    key: 'nombre',
    ellipsis: true,
    render: (_: any, r: any) => (r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-'),
  },
  {
    title: 'Debito',
    key: 'debito',
    width: 130,
    align: 'right' as const,
    render: (_: any, r: any) => (esDebito(r.tipoAsiento) ? formatNumber(r.monto) : ''),
  },
  {
    title: 'Credito',
    key: 'credito',
    width: 130,
    align: 'right' as const,
    render: (_: any, r: any) => (esCredito(r.tipoAsiento) ? formatNumber(r.monto) : ''),
  },
  {
    title: 'Generado',
    key: 'generado',
    width: 90,
    align: 'center' as const,
    render: (_: any, r: any) => (r.generado === false ? 'Manual' : 'Auto'),
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

  return (
    <Table
      dataSource={asientos || []}
      columns={columns}
      rowKey={rowKey || "id"}
      size="small"
      pagination={false}
      scroll={scroll || { x: 900 }}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <strong>Totales</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <strong>{formatNumber(totalDebitos)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <strong>{formatNumber(totalCreditos)}</strong>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};

export default AsientosContableTable;
