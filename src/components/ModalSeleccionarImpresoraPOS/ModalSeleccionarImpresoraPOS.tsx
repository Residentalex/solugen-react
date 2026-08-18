import React from 'react';
import { Modal, Radio, Select, Space } from 'antd';

// ===== Tipos =====
export interface ModalSeleccionarImpresoraPOSProps {
  open: boolean;
  impresoras: string[];
  seleccionada?: string;
  onSelect: (impresora: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  titulo?: string;
  okText?: string;
  cancelText?: string;
  deshabilitarOkSinSeleccion?: boolean;
  usarSelect?: boolean;
}

const ModalSeleccionarImpresoraPOS: React.FC<ModalSeleccionarImpresoraPOSProps> = ({
  open,
  impresoras,
  seleccionada,
  onSelect,
  onConfirm,
  onClose,
  titulo = 'Seleccionar impresora POS',
  okText = 'Imprimir',
  cancelText = 'Cancelar',
  deshabilitarOkSinSeleccion = true,
  usarSelect = false,
}) => {
  return (
    <Modal
      title={titulo}
      open={open}
      onOk={onConfirm}
      onCancel={onClose}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ disabled: deshabilitarOkSinSeleccion ? !seleccionada : undefined }}
    >
      {usarSelect ? (
        <Select
          style={{ width: '100%' }}
          value={seleccionada}
          onChange={(v) => onSelect(v)}
          options={impresoras.map((p) => ({ label: p, value: p }))}
        />
      ) : (
        <Radio.Group onChange={(e) => onSelect(e.target.value)} value={seleccionada}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {impresoras.map((name) => (
              <Radio key={name} value={name} style={{ width: '100%' }}>
                {name}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      )}
    </Modal>
  );
};

export default ModalSeleccionarImpresoraPOS;