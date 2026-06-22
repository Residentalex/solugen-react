import React, { useState, useEffect } from 'react';
import { Modal, DatePicker, Typography, message, Space, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';

const { Text } = Typography;

// ===== Helpers =====
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return 'â€”';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

interface CierreReaperturaModalProps {
  open: boolean;
  sucursal: number;
  fechaCierreActual: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CierreReaperturaModal: React.FC<CierreReaperturaModalProps> = ({
  open,
  sucursal,
  fechaCierreActual,
  onClose,
  onSuccess,
}) => {
  const [fechaNueva, setFechaNueva] = useState<dayjs.Dayjs | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setFechaNueva(null);
      setError(null);
    }
  }, [open]);

  const handleConfirmar = async () => {
    if (!fechaNueva) {
      setError('Debe seleccionar una fecha');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const fechaNuevaStr = formatDateISO(fechaNueva.toDate());
      const fechaAnterior = fechaCierreActual
        ? formatDateISO(new Date(fechaCierreActual))
        : formatDateISO(new Date());

      await cierreInventarioApi.reaperturar(sucursal, fechaNuevaStr, fechaAnterior);
      message.success('PerÃ­odo reaperturado exitosamente');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al reaperturar perÃ­odo';
      setError(msg);
      message.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <LockOutlined style={{ color: '#4a7db5' }} />
          <span>Reaperturar Cierre de Inventario</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      destroyOnHidden
      centered
    >
      <div style={{ padding: '8px 0' }}>
        {/* Fecha actual */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '12px 16px',
            background: 'var(--paces-hover-bg)',
            borderRadius: 6,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Fecha de cierre actual
          </Text>
          <Text strong style={{ fontSize: 15, color: 'var(--paces-primary)' }}>
            {formatDateDisplay(fechaCierreActual)}
          </Text>
        </div>

        {/* Selector de nueva fecha */}
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Seleccionar nueva fecha de cierre
          </Text>
          <DatePicker
            style={{ width: '100%' }}
            value={fechaNueva}
            onChange={(date) => {
              setFechaNueva(date);
              setError(null);
            }}
            format="DD/MM/YYYY"
            placeholder="Seleccionar fecha"
            disabledDate={(current) => current && current > dayjs().endOf('day')}
            size="large"
          />
        </div>

        {/* Mensaje de error */}
        {error && (
          <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            {error}
          </Text>
        )}

        <Text
          type="secondary"
          style={{ fontSize: 11, display: 'block', marginTop: 8, marginBottom: 16 }}
        >
          La reapertura permitirÃ¡ modificar documentos en el perÃ­odo seleccionado.
        </Text>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--paces-border)', paddingTop: 16 }}>
          <Button onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleConfirmar}
            loading={guardando}
            style={{ backgroundColor: '#4a7db5', borderColor: '#4a7db5' }}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CierreReaperturaModal;
