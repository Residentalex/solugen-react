import React, { useEffect, useRef, useState, useCallback } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

export interface NotaDebitoGuideProps {
  mode: 'crear' | 'editar';
  concepto: ConceptoDTO | null;
  sucursal: any | null;
  tipo: any | null;
  entidad: any | null;
  detallesCount: number;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  sucursalRef: React.RefObject<HTMLDivElement | null>;
  tipoRef: React.RefObject<HTMLDivElement | null>;
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
  tipo,
  entidad,
  detallesCount,
  conceptoRef,
  sucursalRef,
  tipoRef,
  entidadRef,
  documentosRef,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'sucursal',
        title: 'Paso 1: Sucursal',
        description: 'Seleccione la sucursal a la que pertenece la nota de débito.',
        target: () => sucursalRef.current,
      },
      {
        key: 'tipo',
        title: 'Paso 2: Tipo',
        description: 'Seleccione el tipo de documento para la nota de débito.',
        target: () => tipoRef.current,
      },
      {
        key: 'concepto',
        title: 'Paso 3: Concepto',
        description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
        target: () => conceptoRef.current,
      },
      {
        key: 'entidad',
        title: 'Paso 4: Entidad',
        description: 'Seleccione la entidad (suplidor o cliente) asociada a la nota de débito.',
        target: () => entidadRef.current,
      },
      {
        key: 'documentos',
        title: 'Paso 5: Documentos',
        description: 'Agregue los documentos asociados a la nota de débito.',
        target: () => documentosRef.current,
      },
    ];

    if (!sucursal) return steps[0];
    if (!tipo) return steps[1];
    if (!concepto) return steps[2];
    if (!entidad) return steps[3];
    if (detallesCount === 0) return steps[4];

    return null;
  }, [concepto, sucursal, tipo, entidad, detallesCount, conceptoRef, sucursalRef, tipoRef, entidadRef, documentosRef]);

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

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  return (
    <GuidePopover
      title={currentStep.title}
      description={currentStep.description}
      targetElement={currentStep.target()}
      open={open}
      onClose={() => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; }}
    />
  );
};

export default NotaDebitoGuide;
