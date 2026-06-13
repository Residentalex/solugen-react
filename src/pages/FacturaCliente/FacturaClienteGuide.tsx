import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, AlmacenDTO } from '../../types/entradaAlmacen';
import type { ClienteDTO } from '../../types/facturaPOS';

export interface FacturaClienteGuideProps {
  mode: 'crear' | 'editar';
  tipo: string;
  concepto: ConceptoDTO | null;
  almacen: AlmacenDTO | null;
  cliente: ClienteDTO | null;
  detallesCount: number;
  tieneProductos: boolean;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  clienteRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const FacturaClienteGuide: React.FC<FacturaClienteGuideProps> = ({
  tipo,
  concepto,
  almacen,
  cliente,
  detallesCount,
  tieneProductos,
  tipoRef,
  conceptoRef,
  almacenRef,
  clienteRef,
  agregarFilaRef,
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
        key: 'almacen',
        title: 'Almacén',
        description: 'Debe elegir un almacén para poder continuar.',
        target: () => almacenRef.current,
      },
      {
        key: 'cliente',
        title: 'Cliente',
        description: 'Debe elegir un cliente para poder continuar.',
        target: () => clienteRef.current,
      },
      {
        key: 'productos',
        title: 'Productos',
        description: 'Seleccione productos a agregar para este Documento.',
        target: () => agregarFilaRef.current,
      },
    ];

    if (!tipo) return steps[0];
    if (!concepto) return steps[1];
    if (tieneProductos && !almacen) return steps[2];
    if (!cliente) return steps[3];
    if (detallesCount === 0) return steps[4];

    return null;
  }, [tipo, concepto, almacen, cliente, detallesCount, tieneProductos, tipoRef, conceptoRef, almacenRef, clienteRef, agregarFilaRef]);

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

export default FacturaClienteGuide;
