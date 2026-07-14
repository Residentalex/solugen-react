import React, { useState } from 'react';
import { Modal, Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatNumber, toTitleCase } from '../../utils/formats';
import type { ProductoSeleccionado } from '../BuscarProductoModal/BuscarProductoModal';

interface AgregarProductoGORCModalProps {
  open: boolean;
  onClose: () => void;
  onSelectProducto: (producto: ProductoSeleccionado) => void;
  onSelectConteos: (productos: ProductoSeleccionado[]) => void;
  suplidorProductos: any[] | null;
}

// ===== Helper para extraer valor de campos con nombre variable =====
function getCampo(obj: any, ...campos: string[]): any {
  for (const c of campos) {
    const val = obj?.[c];
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
}

const AgregarProductoGORCModal: React.FC<AgregarProductoGORCModalProps> = ({
  open,
  onClose,
  onSelectProducto,
  onSelectConteos,
  suplidorProductos,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 100,
    },
    {
      title: 'Producto',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => formatNumber(record._costo || 0),
    },
  ];

  const handleAgregar = () => {
    if (selectedRowKeys.length === 0) return;

    const seleccionados = (suplidorProductos ?? []).filter((d) =>
      selectedRowKeys.includes(d.codigo)
    );

    onSelectConteos(seleccionados);
    onClose();
  };

  return (
    <Modal
      title="Agregar producto"
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      destroyOnHidden
    >
      <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
        Productos del suplidor. Seleccione los que desea agregar.
      </p>
      <Table
        dataSource={suplidorProductos ?? []}
        columns={columns}
        rowKey={(r) => r.codigo || Math.random().toString()}
        size="small"
        pagination={false}
        scroll={{ y: 350 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        locale={{ emptyText: 'No se encontraron productos para este suplidor.' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAgregar}
          disabled={selectedRowKeys.length === 0}
        >
          Agregar seleccionados ({selectedRowKeys.length})
        </Button>
      </div>
    </Modal>
  );
};

export default AgregarProductoGORCModal;
