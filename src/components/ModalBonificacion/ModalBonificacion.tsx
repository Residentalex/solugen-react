import React, { useState, useEffect } from 'react';
import { Modal, InputNumber } from 'antd';

export interface ModalBonificacionProps {
  open: boolean;
  valorActual: number;
  onClose: () => void;
  onBonificacionChange: (valor: number) => void;
}

const ModalBonificacion: React.FC<ModalBonificacionProps> = ({
  open,
  valorActual,
  onClose,
  onBonificacionChange,
}) => {
  const [valorLocal, setValorLocal] = useState<number>(0);

  // Sincronizar cuando cambia el valor actual o se abre el modal
  useEffect(() => {
    if (open) {
      setValorLocal(valorActual);
    }
  }, [open, valorActual]);

  const handleAceptar = () => {
    onBonificacionChange(valorLocal);
  };

  return (
    <Modal
      title="Bonificación"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={300}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#595959' }}>
            Cantidad bonificable
          </label>
          <InputNumber
            autoFocus
            style={{ width: '100%' }}
            min={0}
            step={0.01}
            precision={2}
            value={valorLocal}
            onChange={(val) => setValorLocal(val ?? 0)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 16px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={handleAceptar}
            style={{
              padding: '6px 16px',
              background: '#556ee6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalBonificacion;
