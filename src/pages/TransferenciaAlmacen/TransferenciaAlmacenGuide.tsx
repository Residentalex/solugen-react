import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, AlmacenDTO } from '../../types/entradaAlmacen';

// ===== Componente Guía paso a paso para TRP =====
export interface TransferenciaAlmacenGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  almacenOrigen: AlmacenDTO | null;
  almacenDestino: AlmacenDTO | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  almacenOrigenRef: React.RefObject<HTMLDivElement | null>;
  almacenDestinoRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const TransferenciaAlmacenGuide: React.FC<TransferenciaAlmacenGuideProps> = ({
  concepto,
  almacenOrigen,
  almacenDestino,
  detallesCount,
  conceptoRef,
  almacenOrigenRef,
  almacenDestinoRef,
  agregarFilaRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'concepto',
        title: 'Paso 1: Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
        target: () => conceptoRef.current,
      },
      {
        key: 'almacenOrigen',
        title: 'Paso 2: Almacén Origen',
        description: 'Seleccione el almacén desde donde saldrá la mercancía.',
        target: () => almacenOrigenRef.current,
      },
      {
        key: 'almacenDestino',
        title: 'Paso 3: Almacén Destino',
        description: 'Seleccione el almacén de destino. Debe ser diferente al almacén origen.',
        target: () => almacenDestinoRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 4: Productos',
        description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!concepto) return steps[0];
    if (!almacenOrigen) return steps[1];
    if (!almacenDestino) return steps[2];
    if (detallesCount === 0) return steps[3];

    return null;
  }, [concepto, almacenOrigen, almacenDestino, detallesCount, conceptoRef, almacenOrigenRef, almacenDestinoRef, agregarFilaRef]);

  currentStepRef.current = getCurrentStep();

  useEffect(() => {
    const current = getCurrentStep();
    if (current) {
      if (dismissedStepRef.current !== current.key) {
        setOpen(true);
      }
    } else {
      setOpen(false);
      dismissedStepRef.current = null;
    }
  }, [getCurrentStep]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ant-popover')) return;
      setOpen(false);
      if (currentStepRef.current) {
        dismissedStepRef.current = currentStepRef.current.key;
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  const targetElement = currentStep.target();
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  return createPortal(
    <Popover
      open={open}
      onOpenChange={(visible: boolean) => {
        if (!visible) {
          setOpen(false);
          dismissedStepRef.current = currentStep.key;
        }
      }}
      title={currentStep.title}
      content={currentStep.description}
      placement="top"
      trigger={[]}
      rootClassName="guide-popover"
      styles={{ body: { maxWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word' } }}
    >
      <span
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </Popover>,
    document.body,
  );
};
