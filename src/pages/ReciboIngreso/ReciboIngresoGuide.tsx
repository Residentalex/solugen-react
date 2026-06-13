import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';

export interface ReciboIngresoGuideProps {
  mode: 'crear' | 'editar';
  tipo: any | null;
  concepto: any | null;
  entidad: any | null;
  total: number;
  transaccionesCount: number;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  entidadRef: React.RefObject<HTMLDivElement | null>;
  totalRef: React.RefObject<HTMLDivElement | null>;
  documentosRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const ReciboIngresoGuide: React.FC<ReciboIngresoGuideProps> = ({
  tipo,
  concepto,
  entidad,
  total,
  transaccionesCount,
  tipoRef,
  conceptoRef,
  entidadRef,
  totalRef,
  documentosRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'tipo',
        title: 'Paso 1: Tipo',
        description: 'Debe elegir un tipo de documento para continuar.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 2: Concepto',
        description: 'Seleccione un concepto. Las opciones dependen del tipo seleccionado.',
        target: () => conceptoRef.current,
      },
      {
        key: 'entidad',
        title: 'Paso 3: Entidad',
        description: 'Seleccione la entidad (cliente) asociada al recibo de ingreso.',
        target: () => entidadRef.current,
      },
      {
        key: 'monto',
        title: 'Paso 4: Monto',
        description: 'Ingrese el monto total del recibo de ingreso.',
        target: () => totalRef.current,
      },
      {
        key: 'documentos',
        title: 'Paso 5: Documentos',
        description: 'Agregue los documentos/pagos asociados al recibo de ingreso.',
        target: () => documentosRef.current,
      },
    ];

    if (!tipo) return steps[0];
    if (!concepto) return steps[1];
    if (!entidad) return steps[2];
    if (!total || total === 0) return steps[3];
    if (transaccionesCount === 0) return steps[4];

    return null;
  }, [tipo, concepto, entidad, total, transaccionesCount, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef]);

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

export default ReciboIngresoGuide;
