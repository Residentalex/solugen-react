import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

export interface NotaDebitoGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  sucursal: any | null;
  entidad: any | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  sucursalRef: React.RefObject<HTMLDivElement | null>;
  entidadRef: React.RefObject<HTMLDivElement | null>;
  documentosRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const NotaDebitoGuide: React.FC<NotaDebitoGuideProps> = ({
  concepto,
  sucursal,
  entidad,
  detallesCount,
  conceptoRef,
  sucursalRef,
  entidadRef,
  documentosRef,
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
        key: 'sucursal',
        title: 'Paso 2: Sucursal',
        description: 'Seleccione la sucursal a la que pertenece la nota de débito.',
        target: () => sucursalRef.current,
      },
      {
        key: 'entidad',
        title: 'Paso 3: Entidad',
        description: 'Seleccione la entidad (suplidor o cliente) asociada a la nota de débito.',
        target: () => entidadRef.current,
      },
      {
        key: 'documentos',
        title: 'Paso 4: Documentos',
        description: 'Agregue los documentos asociados a la nota de débito.',
        target: () => documentosRef.current,
      },
    ];

    if (!concepto) return steps[0];
    if (!sucursal) return steps[1];
    if (!entidad) return steps[2];
    if (detallesCount === 0) return steps[3];

    return null;
  }, [concepto, sucursal, entidad, detallesCount, conceptoRef, sucursalRef, entidadRef, documentosRef]);

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

export default NotaDebitoGuide;
