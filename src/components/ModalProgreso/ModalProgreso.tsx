import React, { useRef, useEffect, useState } from 'react';
import { Modal, Steps, Typography } from 'antd';
import {
  LoadingOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleFilled,
} from '@ant-design/icons';
import type { ProgresoEvento } from '../../hooks/useAplicar';

const { Text } = Typography;

interface ModalProgresoProps {
  open: boolean;
  titulo: string;
  eventos: ProgresoEvento[];
  completado: { exito: boolean; error?: string } | null;
  onClose: () => void;
}

const ESTADO_ICONO = {
  pendiente: <ClockCircleFilled style={{ color: '#d9d9d9' }} />,
  en_curso: <LoadingOutlined style={{ color: '#1890ff' }} />,
  exito: <CheckCircleFilled style={{ color: '#52c41a' }} />,
  error: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
};

const ANIMATION_CSS = `
@keyframes paces-slide-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes paces-slide-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(12px);
  }
}
.paces-step-enter {
  animation: paces-slide-in 0.35s ease-out both;
}
.paces-step-exit {
  animation: paces-slide-out 0.3s ease-in both;
}
.paces-steps-container {
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.paces-steps-container .ant-steps-item {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
`;

export const ModalProgreso: React.FC<ModalProgresoProps> = ({
  open,
  titulo,
  eventos,
  completado,
  onClose,
}) => {
  // Mostrar solo los últimos 3 eventos
  const eventosMostrados = (eventos || []).slice(-3);

  // Estado para animar entrada/salida de eventos
  const prevLengthRef = useRef(eventosMostrados.length);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentLength = eventosMostrados.length;
    const prevLength = prevLengthRef.current;

    if (currentLength > 0) {
      // El último item es el nuevo: animar entrada
      const lastItem = eventosMostrados[currentLength - 1];
      const key = String(lastItem.jobId + lastItem.paso + currentLength);
      setAnimatingIds(prev => {
        const next = new Set(prev);
        next.add(key);
        // Limpiar animaciones viejas después de 500ms
        setTimeout(() => {
          setAnimatingIds(old => {
            const cleaned = new Set(old);
            cleaned.delete(key);
            return cleaned;
          });
        }, 500);
        return next;
      });
    }

    prevLengthRef.current = currentLength;
  }, [eventosMostrados.length]);

  const items = eventosMostrados.map((evt, idx) => {
    const key = String(evt.jobId + evt.paso + idx);
    const isNew = animatingIds.has(key);

    return {
      key: idx,
      title: evt.paso,
      description: evt.mensaje || undefined,
      className: isNew ? 'paces-step-enter' : undefined,
      icon: completado
        ? completado.exito
          ? ESTADO_ICONO.exito
          : idx === eventosMostrados.length - 1
            ? ESTADO_ICONO.error
            : ESTADO_ICONO.exito
        : idx === eventosMostrados.length - 1
          ? ESTADO_ICONO.en_curso
          : ESTADO_ICONO.exito,
      status: completado
        ? completado.exito
          ? 'finish' as const
          : idx === eventosMostrados.length - 1
            ? 'error' as const
            : 'finish' as const
        : idx === eventosMostrados.length - 1
          ? 'process' as const
          : 'finish' as const,
    };
  });

  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <Modal
        title={titulo}
        open={open}
        footer={completado ? undefined : null}
        closable={!!completado}
        onOk={completado ? onClose : undefined}
        onCancel={completado ? onClose : undefined}
        mask={false}
        destroyOnHidden
        width={520}
      >
        <div className="paces-steps-container">
          <Steps
            orientation="vertical"
            current={eventosMostrados.length - 1}
            items={items}
          />
        </div>
        {completado && !completado.exito && (
          <Text type="danger" style={{ marginTop: 16, display: 'block' }}>
            {completado.error}
          </Text>
        )}
      </Modal>
    </>
  );
};
