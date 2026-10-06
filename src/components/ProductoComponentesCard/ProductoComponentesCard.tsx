import React, { useState } from 'react';
import { Alert, Button, Empty, InputNumber, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { formatCurrency, toTitleCase } from '../../utils/formats';
import type { ComponenteProductoDTO } from '../../types/receta';
import BuscarProductoModal from '../BuscarProductoModal/BuscarProductoModal';
import type { ProductoSeleccionado } from '../BuscarProductoModal/BuscarProductoModal';

const { Text } = Typography;

export interface ProductoComponentesCardProps {
  /** Codigo del producto padre. Se usa para no permitir el producto como componente. */
  codigoProducto?: string;
  dataSource: ComponenteProductoDTO[];
  onChange: (componentes: ComponenteProductoDTO[]) => void;
  onImportar: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Nombre del componente, indexado por codigo. Solo descriptivo. */
  nombresPorCodigo?: Record<string, string>;
  /** Costo unitario del componente, indexado por codigo. Solo para mostrar el estimado. */
  costosPorCodigo?: Record<string, number>;
}

const ProductoComponentesCard: React.FC<ProductoComponentesCardProps> = ({
  codigoProducto,
  dataSource,
  onChange,
  onImportar,
  loading = false,
  disabled = false,
  nombresPorCodigo,
  costosPorCodigo,
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  /** Nombres de los componentes agregados manualmente en esta sesion. */
  const [nombresLocales, setNombresLocales] = useState<Record<string, string>>({});

  const nombres = { ...nombresPorCodigo, ...nombresLocales };

  const costoEstimado = dataSource.reduce((suma, c) => {
    const costo = costosPorCodigo?.[c.codigo];
    return costo != null ? suma + costo * (c.cantidad || 0) : suma;
  }, 0);

  const agregar = (codigo: string, nombre?: string) => {
    if (!codigo) return;
    if (codigoProducto && codigo.toUpperCase() === codigoProducto.toUpperCase()) return;

    if (dataSource.some((c) => c.codigo.toUpperCase() === codigo.toUpperCase())) return;

    if (nombre) {
      setNombresLocales((prev) => ({ ...prev, [codigo]: nombre }));
    }

    onChange([...dataSource, { codigo, cantidad: 1 }]);
  };

  const cambiarCantidad = (codigo: string, cantidad: number | null) => {
    onChange(
      dataSource.map((c) =>
        c.codigo === codigo ? { ...c, cantidad: cantidad ?? 0 } : c
      )
    );
  };

  const quitar = (codigo: string) => {
    onChange(dataSource.filter((c) => c.codigo !== codigo));
  };

  const handleSelect = (producto: ProductoSeleccionado) => {
    agregar(producto.codigo, producto.articulo);
  };

  const columnas: ColumnsType<ComponenteProductoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 160,
      render: (codigo: string) => <Text strong>{codigo}</Text>,
    },
    {
      title: 'Artículo',
      dataIndex: 'codigo',
      render: (codigo: string) => {
        const nombre = nombres[codigo];
        return nombre ? toTitleCase(nombre) : '-';
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 150,
      align: 'right',
      render: (cantidad: number, record: ComponenteProductoDTO) => (
        <InputNumber
          min={0.0001}
          step={1}
          precision={4}
          size="small"
          value={cantidad}
          disabled={disabled}
          onChange={(v) => cambiarCantidad(record.codigo, v)}
          style={{ width: 130 }}
        />
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      align: 'center',
      render: (_: unknown, record: ComponenteProductoDTO) => (
        <Button
          type="link"
          size="small"
          danger
          disabled={disabled}
          onClick={() => quitar(record.codigo)}
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
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setModalAbierto(true)}
          disabled={disabled}
        >
          Agregar Componente
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={onImportar}
          disabled={disabled}
        >
          Importar plantilla
        </Button>
        <div style={{ flex: 1 }} />
        {dataSource.length > 0 && (
          <Space size={8}>
            <Tag color="blue">{dataSource.length} componente{dataSource.length !== 1 ? 's' : ''}</Tag>
            {costosPorCodigo && costoEstimado > 0 && (
              <Text className="paces-text-total">
                <CalculatorOutlined /> {formatCurrency(costoEstimado)}
              </Text>
            )}
          </Space>
        )}
      </div>

      {codigoProducto && dataSource.some((c) => c.codigo === codigoProducto) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`El código ${codigoProducto} es el propio producto y no puede ser un componente de sí mismo. Quítelo de la lista.`}
        />
      )}

      <Table<ComponenteProductoDTO>
        dataSource={dataSource}
        columns={columnas}
        rowKey="codigo"
        size="small"
        loading={loading}
        pagination={false}
        scroll={{ x: 600 }}
        locale={{
          emptyText: (
            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Sin componentes. Agregue un componente o importe una plantilla." />
            </div>
          ),
        }}
        className="paces-border-top paces-list-table"
      />

      <BuscarProductoModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSelect={handleSelect}
        mode="inventario"
      />
    </>
  );
};

export default ProductoComponentesCard;
