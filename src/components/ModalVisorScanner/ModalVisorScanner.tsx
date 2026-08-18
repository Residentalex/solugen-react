import React, { useEffect, useRef } from 'react';
import { Modal, Spin } from 'antd';

// ===== Tipos =====
export interface ModalVisorScannerProps {
  open: boolean;
  titulo: string;
  url: string | null;
  loading: boolean;
  onClose: () => void;
}

/**
 * Visor de documento escaneado (blob URL en iframe).
 *
 * DECISIÓN DE CLEANUP (Opción A): el componente centraliza el revoke de la URL.
 * Al pasar `open` de true a false, revoca la última URL recibida (vía ref, para
 * no depender de que `url` siga poblada cuando el padre la limpia en onClose) y
 * llama a `onClose`. El padre solo cierra su estado (modal + url), sin revocar.
 * Esto garantiza un único revoke y cero cambio de comportamiento respecto al
 * onCancel original de cada copia.
 */
const ModalVisorScanner: React.FC<ModalVisorScannerProps> = ({ open, titulo, url, loading, onClose }) => {
  // Conserva la última URL no nula para poder revocarla al cerrar aunque el
  // padre limpie `url` en el mismo render que cierra el modal.
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (url) urlRef.current = url;
  }, [url]);

  useEffect(() => {
    if (!open && urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, [open]);

  return (
    <Modal
      title={titulo}
      open={open}
      onCancel={onClose}
      width="80%"
      style={{ top: 20 }}
      footer={null}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : url ? (
        <iframe src={url} style={{ width: '100%', height: '70vh', border: 'none' }} title="Scanner" />
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}
    </Modal>
  );
};

export default ModalVisorScanner;