import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../../types/entradaAlmacen';

export interface SalidaAlmacenGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  almacen: AlmacenDTO | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
  suplidoresDisponibles?: boolean;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const SalidaAlmacenGuide: React.FC<SalidaAlmacenGuideProps> = ({
  concepto,
  suplidor,
  almacen,
  detallesCount,
  conceptoRef,
  suplidorRef,
  almacenRef,
  agregarFilaRef,
  suplidoresDisponibles,
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
        key: 'almacen',
        title: 'Paso 2: Almacén',
        description: 'Seleccione el almacén desde donde saldrá la mercancía.',
        target: () => almacenRef.current,
      },
      {
        key: 'suplidor',
        title: 'Paso 3: Entidad',
        description: 'Seleccione la entidad destino de la salida.',
        target: () => suplidorRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 4: Productos',
        description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!concepto) return steps[0];
    if (!almacen) return steps[1];
    if (suplidoresDisponibles && !suplidor) return steps[2];
    if (detallesCount === 0) return steps[3];

    return null;
  }, [concepto, almacen, suplidor, detallesCount, suplidoresDisponibles, conceptoRef, almacenRef, suplidorRef, agregarFilaRef]);

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

export default SalidaAlmacenGuide;
