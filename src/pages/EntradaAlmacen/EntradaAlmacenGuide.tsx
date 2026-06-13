import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, SuplidorDTO, AlmacenDTO, OrdenCompraVistaDTO } from '../../types/entradaAlmacen';

export interface EntradaAlmacenGuideProps {
  /** Modo del formulario: 'crear' o 'editar' */
  mode: 'crear' | 'editar';
  /** Concepto seleccionado */
  concepto: ConceptoDTO | null;
  /** Suplidor seleccionado */
  suplidor: SuplidorDTO | null;
  /** Orden de compra seleccionada */
  ordenCompra: OrdenCompraVistaDTO | null;
  /** Almacén seleccionado */
  almacen: AlmacenDTO | null;
  /** Detalles del documento */
  detallesCount: number;
  /** Valor actual del NCF */
  ncf?: string;
  /** Refs a los elementos del DOM */
  conceptoRef: React.RefObject<HTMLElement | null>;
  suplidorRef: React.RefObject<HTMLElement | null>;
  ordenCompraRef: React.RefObject<HTMLElement | null>;
  almacenRef: React.RefObject<HTMLElement | null>;
  agregarFilaRef: React.RefObject<HTMLElement | null>;
  ncfRef?: React.RefObject<HTMLElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLElement | null;
}

const EntradaAlmacenGuide: React.FC<EntradaAlmacenGuideProps> = ({
  concepto,
  suplidor,
  ordenCompra,
  almacen,
  detallesCount,
  conceptoRef,
  suplidorRef,
  ordenCompraRef,
  almacenRef,
  agregarFilaRef,
  ncf,
  ncfRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  // Determinar el paso actual según la lógica del escritorio
  const currentStep = useMemo<GuideStep | null>(() => {
    const steps: GuideStep[] = [
      {
        key: 'concepto',
        title: 'Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento, por ejemplo qué documento se va a generar, el almacén por defecto, o si va a generar asientos o no, etc.',
        target: () => conceptoRef.current,
      },
      {
        key: 'suplidor',
        title: 'Suplidor',
        description: 'Debe elegir un suplidor para poder continuar.',
        target: () => suplidorRef.current,
      },
      {
        key: 'ordenCompra',
        title: 'Orden de Compra',
        description: 'Seleccione una orden de compra.',
        target: () => ordenCompraRef.current,
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
      {
        key: 'ncf',
        title: 'NCF',
        description: 'Debe digitar un NCF.',
        target: () => ncfRef?.current || null,
      },
    ];

    // Lógica de prioridad
    if (!concepto) return steps[0];
    if (!suplidor) return steps[1];
    // Solo pedir OC si el suplidor requiere ORC
    if (suplidor.requiereORC && !ordenCompra) return steps[2];
    if (!almacen) return steps[3];
    // Solo pedir productos manuales si no hay OC seleccionada
    if (!ordenCompra && detallesCount === 0) return steps[4];
    // NCF requerido si el concepto genera RDE
    if (concepto?.docAGenerar === 'RDE' && !ncf) return steps[5];

    return null;
  }, [concepto, suplidor, ordenCompra, almacen, detallesCount, ncf, conceptoRef, suplidorRef, ordenCompraRef, almacenRef, agregarFilaRef, ncfRef]);

  // Mantener ref sincronizada para usar en handlers sin stale closures
  currentStepRef.current = currentStep;

  // Mostrar guía cuando cambia el paso (avance automático)
  useEffect(() => {
    if (currentStep) {
      if (dismissedStepRef.current !== currentStep.key) {
        setOpen(true);
      }
    } else {
      setOpen(false);
      dismissedStepRef.current = null;
    }
  }, [currentStep?.key]);

  // Cerrar guía al hacer click fuera del popover
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

export default EntradaAlmacenGuide;
