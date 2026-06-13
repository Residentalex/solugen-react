import React, { useState, useEffect } from 'react';
import {
  Modal, Steps, Divider, Typography, Button, Space, DatePicker,
  Descriptions, Alert, Tooltip, Input,
} from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  EditOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

export const MOTIVOS_ANULAR = [
  'Datos Erróneos.',
  'Falta de Información.',
  'Entrada Duplicada.',
  'Otros Motivos...',
];

const STEPS_ITEMS = [
  { title: 'Fecha' },
  { title: 'Motivo' },
  { title: 'Confirmar' },
];

interface ModalAnularProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { fecha: string; motivo: string }) => Promise<void>;
  documento: string;
  fechaDocumento: string;
  fechaMinima?: string;
  periodoCerrado?: boolean;
}

// Opciones de fecha
type OpcionFecha = 'hoy' | 'documento' | 'otra';

const optionCardStyle: React.CSSProperties = {
  border: '1px solid #d9d9d9',
  borderRadius: 8,
  padding: '12px 16px',
  cursor: 'pointer',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

function getSelectedCardStyle(): React.CSSProperties {
  return {
    border: '1px solid #556ee6',
    background: '#f0f3ff',
  };
}

function getHoverCardStyle(): React.CSSProperties {
  return {
    border: '1px solid #adb5bd',
    background: '#fafafa',
  };
}

function getDisabledCardStyle(): React.CSSProperties {
  return {
    opacity: 0.45,
    cursor: 'not-allowed',
    background: '#f5f5f5',
  };
}

// Format date helper for output: yyyyMMddHHmmss with 000000 as time
function formatFechaOutput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T00:00:00`;
}

function formatDateLegible(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ModalAnular: React.FC<ModalAnularProps> = ({
  open,
  onClose,
  onConfirm,
  documento,
  fechaDocumento,
  fechaMinima,
  periodoCerrado = false,
}) => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [opcionFecha, setOpcionFecha] = useState<OpcionFecha | null>(null);
  const [fechaPersonalizada, setFechaPersonalizada] = useState<Dayjs | null>(null);
  const [opcionMotivo, setOpcionMotivo] = useState<string | null>(null);
  const [motivoLibre, setMotivoLibre] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estados hover para las option cards
  const [hoveredFecha, setHoveredFecha] = useState<OpcionFecha | null>(null);
  const [hoveredMotivo, setHoveredMotivo] = useState<string | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setPaso(1);
      setOpcionFecha(null);
      setFechaPersonalizada(null);
      setOpcionMotivo(null);
      setMotivoLibre('');
      setSubmitting(false);
      setHoveredFecha(null);
      setHoveredMotivo(null);
    }
  }, [open]);

  // ===== Fecha helpers =====
  const hoy = dayjs();
  const fechaDocDayjs = dayjs(fechaDocumento);
  const fechaMinDayjs = fechaMinima ? dayjs(fechaMinima) : undefined;

  const fechaSeleccionada: Dayjs | null = opcionFecha === 'hoy'
    ? hoy
    : opcionFecha === 'documento'
      ? fechaDocDayjs
      : opcionFecha === 'otra'
        ? fechaPersonalizada
        : null;

  const fechaHabilitada = (current: Dayjs) => {
    if (fechaMinDayjs && current.isBefore(fechaMinDayjs, 'day')) return true; // disabled
    if (current.isAfter(hoy, 'day')) return true; // disabled
    return false;
  };

  // ===== Motivo helpers =====
  const esOtrosMotivos = opcionMotivo === 'Otros Motivos...';
  const motivoValido = opcionMotivo
    ? esOtrosMotivos
      ? motivoLibre.trim().length >= 5
      : true
    : false;

  const pasoFechaValido = opcionFecha !== null && (
    opcionFecha !== 'otra' || (fechaPersonalizada !== null)
  );

  // ===== Handlers =====
  const handleSiguiente = () => {
    if (paso === 1 && pasoFechaValido) {
      setPaso(2);
    } else if (paso === 2 && motivoValido && esOtrosMotivos) {
      setPaso(3);
    }
  };

  const handleAnterior = () => {
    if (paso === 2) setPaso(1);
    else if (paso === 3) setPaso(2);
  };

  const handleMotivoClick = (motivo: string) => {
    setOpcionMotivo(motivo);
    if (motivo !== 'Otros Motivos...') {
      // Avanza automáticamente al paso 3 con setTimeout 150ms
      setTimeout(() => {
        setPaso(3);
      }, 150);
    }
  };

  const handleConfirm = async () => {
    if (!fechaSeleccionada || !opcionMotivo) return;
    setSubmitting(true);
    try {
      const motivoFinal = esOtrosMotivos ? motivoLibre.trim() : opcionMotivo;
      const fechaStr = formatFechaOutput(fechaSeleccionada.toDate());
      await onConfirm({ fecha: fechaStr, motivo: motivoFinal });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  // ===== Option Card render helper =====
  const renderFechaCard = (
    opcion: OpcionFecha,
    icon: React.ReactNode,
    titulo: string,
    subtexto: string,
    disabled: boolean,
    tooltipTitle?: string,
  ) => {
    const isSelected = opcionFecha === opcion;
    const isHovered = hoveredFecha === opcion;

    const cardStyle: React.CSSProperties = {
      ...optionCardStyle,
      ...(disabled ? getDisabledCardStyle() : {}),
      ...(isSelected ? getSelectedCardStyle() : {}),
      ...(!disabled && isHovered && !isSelected ? getHoverCardStyle() : {}),
    };

    const content = (
      <div
        style={cardStyle}
        onClick={disabled ? undefined : () => { setOpcionFecha(opcion); if (opcion !== 'otra') setFechaPersonalizada(null); }}
        onMouseEnter={disabled ? undefined : () => setHoveredFecha(opcion)}
        onMouseLeave={disabled ? undefined : () => setHoveredFecha(null)}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 500 }}>{titulo}</div>
          <div className="paces-text-secondary" style={{ fontSize: 12 }}>{subtexto}</div>
        </div>
      </div>
    );

    if (disabled && tooltipTitle) {
      return <Tooltip title={tooltipTitle} key={opcion}>{content}</Tooltip>;
    }
    return content;
  };

  const renderMotivoCard = (
    motivo: string,
    icon: React.ReactNode,
  ) => {
    const isSelected = opcionMotivo === motivo;
    const isHovered = hoveredMotivo === motivo;

    const cardStyle: React.CSSProperties = {
      ...optionCardStyle,
      ...(isSelected ? getSelectedCardStyle() : {}),
      ...(!isSelected && isHovered ? getHoverCardStyle() : {}),
    };

    return (
      <div
        key={motivo}
        style={cardStyle}
        onClick={() => handleMotivoClick(motivo)}
        onMouseEnter={() => setHoveredMotivo(motivo)}
        onMouseLeave={() => setHoveredMotivo(null)}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 500 }}>{motivo}</div>
        </div>
      </div>
    );
  };

  // ===== Render paso 1: Fecha =====
  const renderPasoFecha = () => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Selecciona la fecha de anulación:</Text>
      </div>

      {renderFechaCard(
        'hoy',
        <CalendarOutlined />,
        'Fecha del Día',
        `Hoy, ${hoy.format('DD/MM/YYYY')}`,
        false,
      )}

      {renderFechaCard(
        'documento',
        <FileTextOutlined />,
        'Fecha del Documento',
        formatDateLegible(fechaDocumento),
        periodoCerrado,
        'El período contable está cerrado para esta fecha',
      )}

      {renderFechaCard(
        'otra',
        <EditOutlined />,
        'Otra Fecha',
        'Selecciona una fecha específica',
        false,
      )}

      {opcionFecha === 'otra' && (
        <div style={{ marginTop: 12, marginLeft: 44 }}>
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={fechaPersonalizada}
            onChange={(date) => setFechaPersonalizada(date)}
            disabledDate={fechaHabilitada}
            placeholder="Seleccionar fecha..."
          />
        </div>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button disabled={submitting} onClick={handleClose}>Cancelar</Button>
        <Button
          type="primary"
          disabled={!pasoFechaValido}
          onClick={handleSiguiente}
        >
          Siguiente →
        </Button>
      </div>
    </div>
  );

  // ===== Render paso 2: Motivo =====
  const renderPasoMotivo = () => (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Text strong>Selecciona el motivo de anulación:</Text>
      </div>

      {renderMotivoCard('Datos Erróneos.', <WarningOutlined />)}
      {renderMotivoCard('Falta de Información.', <InfoCircleOutlined />)}
      {renderMotivoCard('Entrada Duplicada.', <CopyOutlined />)}
      {renderMotivoCard('Otros Motivos...', <EditOutlined />)}

      {esOtrosMotivos && (
        <div style={{ marginTop: 12 }}>
          <TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder="Describa el motivo..."
            value={motivoLibre}
            onChange={(e) => setMotivoLibre(e.target.value)}
          />
        </div>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleAnterior}>← Anterior</Button>
        <Space>
          <Button disabled={submitting} onClick={handleClose}>Cancelar</Button>
          {esOtrosMotivos && (
            <Button
              type="primary"
              disabled={!motivoValido}
              onClick={handleSiguiente}
            >
              Siguiente →
            </Button>
          )}
        </Space>
      </div>
    </div>
  );

  // ===== Render paso 3: Confirmación =====
  const getMotivoLegible = (): string => {
    if (!opcionMotivo) return '-';
    if (esOtrosMotivos) return motivoLibre.trim() || '-';
    return opcionMotivo;
  };

  const renderPasoConfirmacion = () => (
    <div>
      <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Documento">{documento}</Descriptions.Item>
        <Descriptions.Item label="Fecha">
          {fechaSeleccionada ? formatDateLegible(fechaSeleccionada.toISOString()) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Motivo">{getMotivoLegible()}</Descriptions.Item>
      </Descriptions>

      <Alert
        message="Esta acción no se puede deshacer."
        type="warning"
        showIcon
      />

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleAnterior}>← Anterior</Button>
        <Space>
          <Button disabled={submitting} onClick={handleClose}>Cancelar</Button>
          <Button
            type="primary"
            danger
            loading={submitting}
            onClick={handleConfirm}
          >
            🚫 Confirmar Anulación
          </Button>
        </Space>
      </div>
    </div>
  );

  // ===== Render step content =====
  const renderStepContent = () => {
    switch (paso) {
      case 1: return renderPasoFecha();
      case 2: return renderPasoMotivo();
      case 3: return renderPasoConfirmacion();
      default: return null;
    }
  };

  return (
    <Modal
      title="Anular documento"
      open={open}
      onCancel={handleClose}
      width={560}
      destroyOnClose
      maskClosable={false}
      closable={!submitting}
      footer={null}
    >
      <Steps current={paso - 1} items={STEPS_ITEMS} />
      <Divider style={{ margin: '16px 0' }} />
      {renderStepContent()}
    </Modal>
  );
};

export default ModalAnular;
