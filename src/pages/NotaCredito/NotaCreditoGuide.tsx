import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

export interface NotaCreditoGuideProps {
  mode: 'crear' | 'editar';
  tipo: string;
  concepto: ConceptoDTO | null;
  entidad: any | null;
  total: number;
  detallesCount: number;
  ncf?: string;
  requiereNCF?: boolean;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  entidadRef: React.RefObject<HTMLDivElement | null>;
  montoRef: React.RefObject<HTMLDivElement | null>;
  documentosRef: React.RefObject<HTMLDivElement | null>;
  ncfRef?: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const NotaCreditoGuide: React.FC<NotaCreditoGuideProps> = ({
  tipo,
  concepto,
  entidad,
  total,
  detallesCount,
  ncf,
  requiereNCF,
  tipoRef,
  conceptoRef,
  entidadRef,
  montoRef,
  documentosRef,
  ncfRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'tipo',
        title: 'Tipo de Documento',
        description: 'Debe elegir un tipo de Documento para poder continuar. Los tipos determinan ciertas acciones del documento, por ejemplo si este documento se visualizará en los estados de cuentas, un reporte en específico, etc.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento, por ejemplo qué documento se va a generar, el almacén por defecto, o si va a generar asientos o no, etc.',
        target: () => conceptoRef.current,
      },
      {
        key: 'entidad',
        title: 'Entidad',
        description: 'Debe elegir una entidad para poder continuar.',
        target: () => entidadRef.current,
      },
      {
        key: 'monto',
        title: 'Monto',
        description: 'Digite el Monto para poder continuar.',
        target: () => montoRef.current,
      },
      {
        key: 'documentos',
        title: 'Documentos',
        description: 'Seleccione Documentos para acreditar.',
        target: () => documentosRef.current,
      },
      {
        key: 'ncf',
        title: 'NCF',
        description: 'Debe digitar un NCF.',
        target: () => ncfRef?.current || null,
      },
    ];

    if (!tipo) return steps[0];
    if (!concepto) return steps[1];
    if (!entidad) return steps[2];
    if (total === 0) return steps[3];
    if (detallesCount === 0) return steps[4];
    if (requiereNCF && !ncf) return steps[5];

    return null;
  }, [tipo, concepto, entidad, total, detallesCount, ncf, requiereNCF, tipoRef, conceptoRef, entidadRef, montoRef, documentosRef, ncfRef]);

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

export default NotaCreditoGuide;
