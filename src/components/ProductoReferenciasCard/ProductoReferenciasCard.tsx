import React from 'react';
import { Alert, Button, Empty, Input, InputNumber, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Select } from '../Select';
import type { ReferenciaProductoDTO, UnidadMedidaDTO } from '../../types/productos';

const { Text } = Typography;

export interface ProductoReferenciasCardProps {
  dataSource: ReferenciaProductoDTO[];
  onChange: (referencias: ReferenciaProductoDTO[]) => void;
  unidades: UnidadMedidaDTO[];
  disabled?: boolean;
}

const ProductoReferenciasCard: React.FC<ProductoReferenciasCardProps> = ({
  dataSource,
  onChange,
  unidades,
  disabled = false,
}) => {
  const agregar = () => {
    onChange([...dataSource, { referencia: '', cantidad: 1 }]);
  };

  const actualizar = (index: number, cambios: Partial<ReferenciaProductoDTO>) => {
    onChange(dataSource.map((referencia, i) => (i === index ? { ...referencia, ...cambios } : referencia)));
  };

  const quitar = (index: number) => {
    onChange(dataSource.filter((_, i) => i !== index));
  };

  const opcionesPresentacion = unidades
    .filter((u) => u.idExterno != null)
    .map((u) => ({
      value: u.idExterno as number,
      label: u.nombre || u.codigo || String(u.idExterno),
    }));

  const referenciasValidas = dataSource
    .map((r) => (r.referencia || '').trim().toUpperCase())
    .filter((r) => r !== '');

  const duplicadas = Array.from(new Set(referenciasValidas.filter((r, i) => referenciasValidas.indexOf(r) !== i)));

  const columnas: ColumnsType<ReferenciaProductoDTO> = [
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      render: (referencia: string, _record: ReferenciaProductoDTO, index: number) => (
        <Input
          value={referencia}
          maxLength={20}
          placeholder="Código de barras"
          disabled={disabled}
          onChange={(e) => actualizar(index, { referencia: e.target.value })}
        />
      ),
    },
    {
      title: 'Presentación',
      dataIndex: 'presentacionEquivalenteID',
      width: 240,
      render: (presentacion: number | undefined, _record: ReferenciaProductoDTO, index: number) => (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Seleccionar presentación"
          value={presentacion}
          disabled={disabled}
          options={opcionesPresentacion}
          onChange={(value) => actualizar(index, { presentacionEquivalenteID: value ?? undefined })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 130,
      align: 'right',
      render: (cantidad: number, _record: ReferenciaProductoDTO, index: number) => (
        <InputNumber
          min={0.01}
          step={1}
          precision={2}
          size="small"
          value={cantidad}
          disabled={disabled}
          onChange={(value) => actualizar(index, { cantidad: value ?? 1 })}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      align: 'center',
      render: (_: unknown, _record: ReferenciaProductoDTO, index: number) => (
        <Button
          type="link"
          size="small"
          danger
          disabled={disabled}
          onClick={() => quitar(index)}
          style={{ padding: 0, height: 'auto' }}
        >
          <DeleteOutlined />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Button type="dashed" icon={<PlusOutlined />} onClick={agregar} disabled={disabled}>
          Agregar Referencia
        </Button>
        <div style={{ flex: 1 }} />
        {dataSource.length > 0 && (
          <Space size={8}>
            <Tag color="blue">
              {dataSource.length} referencia{dataSource.length !== 1 ? 's' : ''}
            </Tag>
          </Space>
        )}
      </div>

      {duplicadas.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Referencia repetida: ${duplicadas.join(', ')}`}
        />
      )}

      <Table<ReferenciaProductoDTO>
        dataSource={dataSource}
        columns={columnas}
        rowKey={(_, index) => String(index)}
        size="small"
        pagination={false}
        scroll={{ x: 720 }}
        locale={{
          emptyText: (
            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Sin referencias. Agregue un código de barras alternativo." />
            </div>
          ),
        }}
        className="paces-border-top paces-list-table"
      />

      {dataSource.length > 0 && (
        <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 8 }}>
          <Text type="secondary">
            Estas referencias se guardan en EQUIVAL y se usan para buscar el producto por códigos de distintos proveedores.
          </Text>
        </div>
      )}
    </>
  );
};

export default ProductoReferenciasCard;
