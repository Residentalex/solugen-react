import React, { useState, useEffect } from 'react';
import { Modal, Select, Typography, Divider, Input, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

export const MOTIVOS_DESAPLICAR = [
  'Datos Erróneos.',
  'Falta de Información.',
  'Falta de un Producto.',
  'Entrada Duplicada.',
  'Otro motivo...',
];

interface ModalDesaplicarProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
  tituloDocumento?: string;
  loading?: boolean;
}

const ModalDesaplicar: React.FC<ModalDesaplicarProps> = ({
  open,
  onClose,
  onConfirm,
  tituloDocumento,
  loading = false,
}) => {
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [otroMotivo, setOtroMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setSelectedMotivo(null);
      setOtroMotivo('');
      setSubmitting(false);
    }
  }, [open]);

  const esOtroMotivo = selectedMotivo === 'Otro motivo...';
  const motivoValido = selectedMotivo
    ? esOtroMotivo
      ? otroMotivo.trim().length >= 5
      : true
    : false;

  const handleConfirm = async () => {
    if (!motivoValido || !selectedMotivo) return;
    setSubmitting(true);
    try {
      const motivoFinal = esOtroMotivo ? otroMotivo.trim() : selectedMotivo;
      await onConfirm(motivoFinal);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>Desaplicar documento</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={480}
      destroyOnHidden
      mask={{ closable: false }}
      closable={!submitting}
      footer={
        <Space>
          <Button disabled={submitting} onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            danger
            disabled={!motivoValido}
            loading={submitting}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </Space>
      }
    >
      {tituloDocumento && (
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14 }}>{tituloDocumento}</Text>
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 8 }}>
        <Text>Selecciona el motivo de desaplicación:</Text>
      </div>

      <Select
        style={{ width: '100%' }}
        placeholder="Seleccionar motivo..."
        value={selectedMotivo}
        onChange={(value) => {
          setSelectedMotivo(value);
          if (value !== 'Otro motivo...') {
            setOtroMotivo('');
          }
        }}
        options={MOTIVOS_DESAPLICAR.map((m) => ({ label: m, value: m }))}
      />

      {esOtroMotivo && (
        <div style={{ marginTop: 12 }}>
          <TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder="Describa el motivo..."
            value={otroMotivo}
            onChange={(e) => setOtroMotivo(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
};

export default ModalDesaplicar;
