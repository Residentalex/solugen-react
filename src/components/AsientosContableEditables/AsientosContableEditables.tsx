import React, { useRef } from 'react';
import { Table, InputNumber, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { toTitleCase } from '../../utils/formats';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function esDebito(tipo: any): boolean { return tipo === 'D' || tipo === 0; }
function esCredito(tipo: any): boolean { return tipo === 'C' || tipo === 1; }

interface AsientosContableEditablesProps {
  asientos: any[];
  onChange: (asientos: any[]) => void;
  editable?: boolean;
  scroll?: { x?: number };
  rowKey?: string | ((record: any) => string);
  onGenerar?: () => void;
  generando?: boolean;
  disableGenerar?: boolean;
}

const AsientosContableEditables: React.FC<AsientosContableEditablesProps> = ({
  asientos,
  onChange,
  editable = false,
  scroll,
  rowKey,
  onGenerar,
  generando = false,
  disableGenerar = false,
}) => {
  const editValuesRef = useRef<Record<string, number>>({});

  const totalDebitos = (asientos || []).reduce((s: number, r: any) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
  const totalCreditos = (asientos || []).reduce((s: number, r: any) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);

  const handleMontoChange = (id: any, field: 'debito' | 'credito', value: number | null) => {
    editValuesRef.current[`${id}_${field}`] = value || 0;
  };

  const handleMontoCommit = (id: any, field: 'debito' | 'credito') => {
    const val = editValuesRef.current[`${id}_${field}`];
    if (val === undefined) return;
    onChange(
      (asientos || []).map((r: any) => {
        if (r.id !== id && r.key !== id) return r;
        return { ...r, monto: Math.round(val * 100) / 100 };
      })
    );
  };

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
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (v: string) => (v ? toTitleCase(v) : '-'),
    },
    {
      title: 'Débito',
      key: 'debito',
      width: 150,
      align: 'right' as const,
      render: (_: any, r: any) => {
        const esD = esDebito(r.tipoAsiento);
        if (!editable || !esD) {
          return esD ? formatNumber(r.monto) : '';
        }
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={r.monto}
            onChange={(val) => handleMontoChange(r.id || r.key, 'debito', val)}
            onBlur={() => handleMontoCommit(r.id || r.key, 'debito')}
            onPressEnter={() => handleMontoCommit(r.id || r.key, 'debito')}
          />
        );
      },
    },
    {
      title: 'Crédito',
      key: 'credito',
      width: 150,
      align: 'right' as const,
      render: (_: any, r: any) => {
        const esC = esCredito(r.tipoAsiento);
        if (!editable || !esC) {
          return esC ? formatNumber(r.monto) : '';
        }
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            defaultValue={r.monto}
            onChange={(val) => handleMontoChange(r.id || r.key, 'credito', val)}
            onBlur={() => handleMontoCommit(r.id || r.key, 'credito')}
            onPressEnter={() => handleMontoCommit(r.id || r.key, 'credito')}
          />
        );
      },
    },
    {
      title: 'Generado',
      key: 'generado',
      width: 90,
      align: 'center' as const,
      render: (_: any, r: any) => (r.generado === false ? 'Manual' : 'Auto'),
    },
  ];

  return (
    <div>
      {onGenerar && (
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon={<ExclamationCircleOutlined />}
            onClick={onGenerar}
            loading={generando}
            disabled={disableGenerar}
          >
            GENERAR
          </Button>
        </div>
      )}
      <Table
        dataSource={asientos || []}
        columns={columns}
        rowKey={rowKey || 'id'}
        size="small"
        pagination={false}
        scroll={scroll || { x: 900 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
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
    </div>
  );
};

export default AsientosContableEditables;
