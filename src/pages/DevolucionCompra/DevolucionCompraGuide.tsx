import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../../types/entradaAlmacen';
import type { TipoDTO } from '../../types/devolucionCompra';

export interface DevolucionCompraGuideProps {
  mode: 'crear' | 'editar';
  tipo: TipoDTO | null;
  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  almacen: AlmacenDTO | null;
  entrada: any | null;
  detallesCount: number;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
  almacenRef: React.RefObject<HTMLDivElement | null>;
  agregarFilaRef: React.RefObject<HTMLDivElement | null>;
  entradaRef: React.RefObject<HTMLDivElement | null>;
  suplidoresDisponibles?: boolean;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

export const DevolucionCompraGuide: React.FC<DevolucionCompraGuideProps> = ({
  tipo,
  concepto,
  suplidor,
  almacen,
  entrada,
  detallesCount,
  tipoRef,
  conceptoRef,
  suplidorRef,
  almacenRef,
  agregarFilaRef,
  entradaRef,
  suplidoresDisponibles,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'tipo',
        title: 'Paso 1: Tipo de Documento',
        description: 'Debe elegir un tipo de documento antes de seleccionar el concepto.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 2: Concepto',
        description: 'Seleccione un concepto. Las opciones disponibles dependen del tipo seleccionado.',
        target: () => conceptoRef.current,
      },
      {
        key: 'suplidor',
        title: 'Paso 3: Suplidor',
        description: 'Seleccione el suplidor. Puede auto-asignarse al elegir una Entrada de Referencia.',
        target: () => suplidorRef.current,
      },
      {
        key: 'entrada',
        title: 'Paso 4: Entrada de Referencia',
        description: 'Seleccione una Entrada de Almacén de referencia para cargar sus productos.',
        target: () => entradaRef.current,
      },
      {
        key: 'almacen',
        title: 'Paso 5: Almacén',
        description: 'Seleccione el almacén donde se registrará la devolución.',
        target: () => almacenRef.current,
      },
      {
        key: 'productos',
        title: 'Paso 6: Productos',
        description: 'Agregue productos usando "Agregar fila", "Buscar Producto" o importando desde una Entrada de Almacén.',
        target: () => agregarFilaRef.current,
      },
    ];

    // Lógica de prioridad (mismo orden que MostrarGuia del desktop)
    if (!tipo) return steps[0];
    if (!concepto) return steps[1];                             // concepto ahora paso 1 (índice 1)
    if (suplidoresDisponibles && !suplidor) return steps[2];    // suplidor ahora paso 2 (índice 2)
    if (tipo?.requiereReferencia && !entrada) return steps[3];  // entrada ahora paso 3 (índice 3)
    if (!almacen) return steps[4];                              // almacen ahora paso 4 (índice 4)
    if (detallesCount === 0) return steps[5];                   // productos ahora paso 5 (índice 5)

    return null;
  }, [tipo, concepto, almacen, suplidor, entrada, detallesCount, suplidoresDisponibles, tipoRef, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, entradaRef]);

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

export default DevolucionCompraGuide;
