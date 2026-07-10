import React, { useRef } from 'react';
import { Table, InputNumber, Button, Tag, Tooltip, Empty, Popconfirm } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, ThunderboltOutlined, DeleteOutlined } from '@ant-design/icons';
import { toTitleCase } from '../../utils/formats';
import { formatNumber, esDebito, esCredito } from '../../utils/contabilidad';

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
  const diferencia = Math.abs(totalDebitos - totalCreditos);
  const esCuadrado = diferencia < 0.01;

  const handleMontoChange = (index: number, field: 'debito' | 'credito', value: number | null) => {
    editValuesRef.current[`${index}_${field}`] = value || 0;
  };

  const handleMontoCommit = (index: number, field: 'debito' | 'credito') => {
    const val = editValuesRef.current[`${index}_${field}`];
    if (val === undefined) return;
    onChange(
      (asientos || []).map((r: any, i: number) => {
        if (i !== index) return r;
        const montoRedondeado = Math.round(val * 100) / 100;
        const upd: any = { ...r, monto: montoRedondeado };
        if (montoRedondeado > 0 && r.monto === 0) {
          upd.tipoAsiento = field === 'debito' ? 'D' : 'C';
        }
        return upd;
      })
    );
  };

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
      render: (_: any, r: any, index: number) => {
        const esD = esDebito(r.tipoAsiento);
        const mostrarInput = editable && (esD || r.monto === 0);
        if (mostrarInput) {
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
              onChange={(val) => handleMontoChange(index, 'debito', val)}
              onBlur={() => handleMontoCommit(index, 'debito')}
              onPressEnter={() => handleMontoCommit(index, 'debito')}
            />
          );
        }
        if (esD) {
          return (
            <Tooltip title={formatNumber(r.monto)} placement="left">
              <span style={{ color: '#f46a6a', fontWeight: 600 }}>{formatNumber(r.monto)}</span>
            </Tooltip>
          );
        }
        return null;
      },
    },
    {
      title: 'Crédito',
      key: 'credito',
      width: 150,
      align: 'right' as const,
      render: (_: any, r: any, index: number) => {
        const esC = esCredito(r.tipoAsiento);
        const mostrarInput = editable && (esC || r.monto === 0);
        if (mostrarInput) {
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
              onChange={(val) => handleMontoChange(index, 'credito', val)}
              onBlur={() => handleMontoCommit(index, 'credito')}
              onPressEnter={() => handleMontoCommit(index, 'credito')}
            />
          );
        }
        if (esC) {
          return (
            <Tooltip title={formatNumber(r.monto)} placement="left">
              <span style={{ color: '#34c38f', fontWeight: 600 }}>{formatNumber(r.monto)}</span>
            </Tooltip>
          );
        }
        return null;
      },
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
    ...(editable
      ? [{
          title: 'Acc',
          key: 'acciones',
          width: 50,
          align: 'center' as const,
          render: (_: any, r: any, index: number) => (
            <Popconfirm
              title="¿Eliminar este asiento?"
              onConfirm={() => {
                const filtered = (asientos || []).filter(
                  (_: any, i: number) => i !== index
                );
                onChange(filtered);
              }}
              okText="Eliminar"
              cancelText="Cancelar"
              placement="left"
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          ),
        }]
      : []),
  ];

  return (
    <div>
      {onGenerar && (
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={onGenerar}
            loading={generando}
            disabled={disableGenerar}
          >
            Generar asientos
          </Button>
        </div>
      )}
      <Table
        dataSource={asientos || []}
        columns={columns}
        rowKey={rowKey || 'id'}
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
              <Table.Summary.Cell index={1} colSpan={3}>
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
              <Table.Summary.Cell index={4} align="right">
                <strong style={{ color: '#f46a6a' }}>{formatNumber(totalDebitos)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong style={{ color: '#34c38f' }}>{formatNumber(totalCreditos)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={editable ? 7 : 6} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default AsientosContableEditables;
