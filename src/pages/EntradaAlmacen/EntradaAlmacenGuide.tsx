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
  /** Refs a los elementos del DOM */
  conceptoRef: React.RefObject<HTMLElement | null>;
  suplidorRef: React.RefObject<HTMLElement | null>;
  ordenCompraRef: React.RefObject<HTMLElement | null>;
  almacenRef: React.RefObject<HTMLElement | null>;
  agregarFilaRef: React.RefObject<HTMLElement | null>;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLElement | null;
}

const EntradaAlmacenGuide: React.FC<EntradaAlmacenGuideProps> = ({
  mode,
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
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
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
        description: 'Seleccione una orden de compra si el suplidor requiere ORC, o puede dejarlo vacío.',
        target: () => ordenCompraRef.current,
      },
      {
        key: 'almacen',
        title: 'Almacén',
        description: 'Seleccione el almacén donde se recibirá la mercancía.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Productos',
        description: 'Agregue productos al documento.',
        target: () => agregarFilaRef.current,
      },
    ];

    // Lógica de prioridad
    if (!concepto) return steps[0];
    if (!suplidor) return steps[1];
    if (suplidor.requiereORC && !ordenCompra) return steps[2];
    if (!almacen) return steps[3];
    // Solo pedir productos manuales si no hay OC seleccionada
    if (!ordenCompra && detallesCount === 0) return steps[4];

    return null;
  }, [concepto, suplidor, ordenCompra, almacen, detallesCount, conceptoRef, suplidorRef, ordenCompraRef, almacenRef, agregarFilaRef]);

  // Mantener ref sincronizada para usar en handlers sin stale closures
  currentStepRef.current = currentStep;

  // Mostrar guía cuando cambia el paso (avance automático)
  // Solo si el usuario no descartó ESTE paso específicamente
  // Se usa ref en lugar de state para evitar stale closures:
  // el efecto solo depende de currentStep?.key, pero necesita
  // leer el valor más reciente de dismissedStep sin re-ejecutarse.
  useEffect(() => {
    if (currentStep) {
      if (dismissedStepRef.current !== currentStep.key) {
        setOpen(true);
      }
    } else {
      // Todo completado, cerrar guía
      setOpen(false);
      dismissedStepRef.current = null;
    }
  }, [currentStep?.key]);

  // Cerrar guía al hacer click fuera del popover
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // No cerrar si el click es dentro del popover
      if (target.closest('.ant-popover')) {
        return;
      }
      setOpen(false);
      if (currentStepRef.current) {
        dismissedStepRef.current = currentStepRef.current.key;
      }
    };

    // Retraso para evitar que el evento que abrió el popover lo cierre inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // No renderizar nada si no hay paso
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