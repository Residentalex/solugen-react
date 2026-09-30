import { useState } from 'react';
import { Button, Descriptions, Modal, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { ESTADOS_ACTIVIDAD } from '../../../types/actividad';
import type { ActividadDTO } from '../../../types/actividad';

const COLOR_ESTADO: Record<string, string> = {
  Pendiente: 'default',
  Confirmado: 'blue',
  EnProceso: 'processing',
  Completado: 'success',
  Cancelado: 'error',
  Reprogramado: 'warning',
};

interface ModalDetalleActividadProps {
  actividad: ActividadDTO | null;
  abierto: boolean;
  onCerrar: () => void;
  onEditar: (actividad: ActividadDTO) => void;
  onCambiarEstado: (actividad: ActividadDTO, estado: string) => Promise<void>;
  onEliminar: (actividad: ActividadDTO) => Promise<void>;
}

export default function ModalDetalleActividad(props: ModalDetalleActividadProps) {
  const { actividad, abierto, onCerrar, onEditar, onCambiarEstado, onEliminar } = props;
  const [cambiando, setCambiando] = useState(false);

  if (!actividad) return null;

  const handleCambiarEstado = async (estado: string) => {
    if (estado === actividad.estado) return;
    setCambiando(true);
    try {
      await onCambiarEstado(actividad, estado);
    } finally {
      setCambiando(false);
    }
  };

  const handleEliminar = () => {
    Modal.confirm({
      title: 'Eliminar actividad',
      content: `¿Eliminar la actividad "${actividad.titulo}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        await onEliminar(actividad);
      },
    });
  };

  const cliente = [actividad.clienteCodigo, actividad.clienteNombre].filter(Boolean).join(' - ');

  return (
    <Modal
      title={`Actividad ${actividad.numero || actividad.id}`}
      open={abierto}
      onCancel={onCerrar}
      width={560}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select
            size="small"
            style={{ width: 160 }}
            value={actividad.estado}
            onChange={handleCambiarEstado}
            disabled={cambiando}
            loading={cambiando}
            options={ESTADOS_ACTIVIDAD.map((estado) => ({ value: estado, label: estado }))}
            aria-label="Cambiar estado"
          />
          <Button danger onClick={handleEliminar}>
            Eliminar
          </Button>
          <div style={{ flex: 1 }} />
          <Button type="primary" onClick={() => onEditar(actividad)}>
            Editar
          </Button>
          <Button onClick={onCerrar}>Cerrar</Button>
        </div>
      }
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Título">{actividad.titulo}</Descriptions.Item>
        <Descriptions.Item label="Estado">
          <Tag color={COLOR_ESTADO[actividad.estado] || 'default'}>{actividad.estado}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Servicio">{actividad.servicioNombre || '-'}</Descriptions.Item>
        <Descriptions.Item label="Responsable">{actividad.responsableNombre || '-'}</Descriptions.Item>
        <Descriptions.Item label="Cliente">{cliente || '-'}</Descriptions.Item>
        <Descriptions.Item label="Inicio">{dayjs(actividad.fechaInicio).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="Fin">
          {actividad.fechaFin ? dayjs(actividad.fechaFin).format('DD/MM/YYYY HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Sucursal">{actividad.sucursalNombre || '-'}</Descriptions.Item>
        <Descriptions.Item label="Descripción">
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {actividad.descripcion || '-'}
          </div>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
