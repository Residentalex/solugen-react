import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import type { ClienteDTO } from '../../types/facturaPOS';

export interface CotizacionVentaGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  cliente: ClienteDTO | null;
  tieneProductos: boolean;
  almacen: any | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  clienteRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const CotizacionVentaGuide: React.FC<CotizacionVentaGuideProps> = ({
  concepto,
  cliente,
  tieneProductos,
  almacen,
  detallesCount,
  conceptoRef,
  clienteRef,
  almacenRef,
  agregarFilaRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'concepto',
        title: 'Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento, por ejemplo qué documento se va a generar, el almacén por defecto, o si va a generar asientos o no, etc.',
        target: () => conceptoRef.current,
      },
      {
        key: 'cliente',
        title: 'Cliente / Entidad',
        description: 'Debe elegir una entidad para poder continuar.',
        target: () => clienteRef.current,
      },
      {
        key: 'almacen',
        title: 'Almacén',
        description: 'Debe elegir un almacén para poder continuar.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Productos',
        description: 'Seleccione productos a agregar para este Documento.',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!concepto) return steps[0];
    if (!cliente) return steps[1];
    if (tieneProductos && !almacen) return steps[2];
    if (detallesCount === 0) return steps[3];

    return null;
  }, [concepto, cliente, tieneProductos, almacen, detallesCount, conceptoRef, clienteRef, almacenRef, agregarFilaRef]);

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
      onOpenChange={(visible) => {
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

export default CotizacionVentaGuide;
