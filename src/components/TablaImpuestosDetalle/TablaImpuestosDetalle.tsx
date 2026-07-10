import React from 'react';
import { Table } from 'antd';
import type { ImpuestoFacturaDTO } from '../../types/impuestos';
import { formatCurrency, toTitleCase } from '../../utils/formats';

export interface TablaImpuestosDetalleProps {
  dataSource: ImpuestoFacturaDTO[];
  loading?: boolean;
  /** Texto a mostrar cuando no hay impuestos */
  emptyText?: string;
}

const TablaImpuestosDetalle: React.FC<TablaImpuestosDetalleProps> = ({
  dataSource,
  loading = false,
  emptyText = 'Sin impuestos',
}) => {
  return (
    <Table
      dataSource={dataSource}
      rowKey={(r) => r.transactionID != null ? `${r.transactionID}-${r.impuesto?.idExterno || ''}` : r.impuesto?.idExterno || Math.random().toString()}
      size="small"
      pagination={false}
      loading={loading}
      scroll={{ x: 600 }}
      locale={{ emptyText }}
      columns={[
        {
          title: 'Impuesto / Retención',
          key: 'nombre',
          ellipsis: true,
          render: (_: any, r: ImpuestoFacturaDTO) => toTitleCase(r.impuesto?.nombre || '-'),
        },
        {
          title: 'Porcentaje',
          key: 'porcentaje',
          width: 100,
          align: 'right' as const,
          render: (_: any, r: ImpuestoFacturaDTO) => (r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-'),
        },
        {
          title: 'No. Cuenta',
          key: 'cuenta',
          width: 150,
          render: (_: any, r: ImpuestoFacturaDTO) => r.impuesto?.noCuenta || '-',
        },
        {
          title: 'Monto',
          key: 'monto',
          width: 140,
          align: 'right' as const,
          render: (_: any, r: ImpuestoFacturaDTO) => formatCurrency(r.monto || 0),
        },
        {
          title: 'Tipo',
          key: 'tipo',
          width: 120,
          render: (_: any, r: ImpuestoFacturaDTO) => {
            if (r.tipo) return toTitleCase(r.tipo);
            if (r.impuesto?.tipo === 1) return 'Impuesto';
            if (r.impuesto?.tipo === 2) return 'Retención';
            return '-';
          },
        },
      ]}
    />
  );
};

export default TablaImpuestosDetalle;
