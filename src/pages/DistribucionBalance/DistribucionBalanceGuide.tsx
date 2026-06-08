import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

export interface DistribucionBalanceGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  entidad: any | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  entidadRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const DistribucionBalanceGuide: React.FC<DistribucionBalanceGuideProps> = ({
  concepto, entidad, detallesCount,
  conceptoRef, entidadRef,
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
        key: 'entidad',
        title: 'Paso 2: Entidad',
        description: 'Seleccione la entidad asociada a la distribución de balance.',
        target: () => entidadRef.current,
      },
      {
        key: 'detalles',
        title: 'Paso 3: Débitos y Créditos',
        description: 'Agregue los montos a distribuir en las pestañas de Débitos y Créditos.',
        target: () => null,
      },
    ];
    if (!concepto) return steps[0];
    if (!entidad) return steps[1];
    if (detallesCount === 0) return steps[2];
    return null;
  }, [concepto, entidad, detallesCount, conceptoRef, entidadRef]);

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

export default DistribucionBalanceGuide;
