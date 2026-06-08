import React from 'react';
import { Table, Select, InputNumber } from 'antd';
import { toTitleCase, formatCurrency } from '../../utils/formats';

export interface ImpuestoFacturaItem {
  id: number | string;
  tipo?: string;          // 'Impuesto' | 'Retencion' | 'Informativo'
  nombre?: string;        // Nombre del impuesto
  porcentaje?: number;    // Porcentaje
  monto?: number;         // Monto del impuesto
  impuesto?: {
    nombre?: string;
    porcentaje?: number;
  };
}

export interface ImpuestosFacturaEditablesProps {
  impuestos: ImpuestoFacturaItem[];
  onChange: (impuestos: ImpuestoFacturaItem[]) => void;
  editable?: boolean;
  scroll?: { x?: number };
  /** Texto a mostrar cuando no hay impuestos */
  emptyText?: string;
}

const ImpuestosFacturaEditables: React.FC<ImpuestosFacturaEditablesProps> = ({
  impuestos,
  onChange,
  editable = false,
  scroll,
  emptyText = 'Sin impuestos',
}) => {
  return (
    <Table
      dataSource={impuestos}
      rowKey="id"
      size="small"
      pagination={false}
      scroll={scroll || { x: 600 }}
      locale={{ emptyText }}
      columns={[
        {
          title: 'Tipo',
          dataIndex: 'tipo',
          key: 'tipo',
          width: 140,
          render: (v: string, _: any, idx: number) => {
            if (!editable) return toTitleCase(v || '');
            return (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={v || undefined}
                onChange={(val) => {
                  const nuevos = [...impuestos];
                  nuevos[idx] = { ...nuevos[idx], tipo: val };
                  onChange(nuevos);
                }}
              >
                <Select.Option value="Impuesto">Impuesto</Select.Option>
                <Select.Option value="Retencion">Retención</Select.Option>
                <Select.Option value="Informativo">Informativo</Select.Option>
              </Select>
            );
          },
        },
        {
          title: 'Nombre',
          key: 'nombre',
          ellipsis: true,
          render: (_v: string, record: any) => toTitleCase(record.impuesto?.nombre || record.nombre || ''),
        },
        {
          title: '%',
          dataIndex: 'porcentaje',
          key: 'porcentaje',
          width: 80,
          align: 'right' as const,
          render: (v: number) => (v ? `${v}%` : '-'),
        },
        {
          title: 'Monto',
          dataIndex: 'monto',
          key: 'monto',
          width: 150,
          align: 'right' as const,
          render: (v: number, _: any, idx: number) => {
            if (!editable) return formatCurrency(v || 0);
            return (
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                step={0.01}
                precision={2}
                controls={false}
                value={v}
                onChange={(val) => {
                  const nuevos = [...impuestos];
                  nuevos[idx] = { ...nuevos[idx], monto: val || 0 };
                  onChange(nuevos);
                }}
              />
            );
          },
        },
      ]}
    />
  );
};

export default ImpuestosFacturaEditables;
