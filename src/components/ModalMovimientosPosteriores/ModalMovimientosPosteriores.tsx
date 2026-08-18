import React from 'react';
import { Modal, Table, Empty } from 'antd';
import { formatNumber, formatDate } from '../../utils/formats';

// ===== Tipos =====
export interface ModalMovimientosPosterioresProps {
  open: boolean;
  sucursal: string;
  codigo: string;
  dataSource: any[];
  loading: boolean;
  onClose: () => void;
}

const ModalMovimientosPosteriores: React.FC<ModalMovimientosPosterioresProps> = ({
  open,
  sucursal,
  codigo,
  dataSource,
  loading,
  onClose,
}) => {
  return (
    <Modal
      title={`Movimientos posteriores — ${sucursal} — ${codigo || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Table
        dataSource={dataSource}
        rowKey="transacid"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        loading={loading}
        locale={{ emptyText: <Empty description="No hay movimientos posteriores" /> }}
        columns={[
          { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (v: string) => formatDate(v) },
          { title: 'Documento', dataIndex: 'documento', width: 160, ellipsis: true },
          { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' as const, render: (v: number) => formatNumber(v) },
        ]}
        scroll={{ x: 600 }}
      />
    </Modal>
  );
};

export default ModalMovimientosPosteriores;