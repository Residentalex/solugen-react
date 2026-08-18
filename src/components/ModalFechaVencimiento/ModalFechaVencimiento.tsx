import React from 'react';
import { Modal, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

// ===== Tipos =====
export interface ModalFechaVencimientoProps {
  open: boolean;
  onClose: () => void;
  onFechaChange: (fecha: Dayjs | null) => void;
}

const ModalFechaVencimiento: React.FC<ModalFechaVencimientoProps> = ({ open, onClose, onFechaChange }) => {
  return (
    <Modal
      title="Fecha de Vencimiento"
      open={open}
      onCancel={onClose}
      onOk={onClose}
      footer={null}
      destroyOnHidden
    >
      <DatePicker
        style={{ width: '100%' }}
        format="YYYY-MM-DD"
        onChange={onFechaChange}
      />
    </Modal>
  );
};

export default ModalFechaVencimiento;
