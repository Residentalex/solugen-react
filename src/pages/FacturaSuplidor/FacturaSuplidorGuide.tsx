import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
import type { ConceptoDTO, SuplidorDTO } from '../../types/entradaAlmacen';

export interface FacturaSuplidorGuideProps {
  mode: 'crear' | 'editar';
  tipo: string;
  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  total: number;
  ncf?: string;
  suplidoresDisponibles?: boolean;
  tipoRef: React.RefObject<HTMLDivElement | null>;
  conceptoRef: React.RefObject<HTMLDivElement | null>;
  suplidorRef: React.RefObject<HTMLDivElement | null>;
  montoRef: React.RefObject<HTMLDivElement | null>;
  ncfRef?: React.RefObject<HTMLDivElement | null>;
  sucursalRef: React.RefObject<HTMLDivElement | null>;
  sucursal: any | null;
}

interface GuideStep {
  key: string;
  title: string;
  description: string;
  target: () => HTMLDivElement | null;
}

const FacturaSuplidorGuide: React.FC<FacturaSuplidorGuideProps> = ({
  tipo,
  concepto,
  suplidor,
  total,
  ncf,
  suplidoresDisponibles,
  tipoRef,
  conceptoRef,
  suplidorRef,
  montoRef,
  ncfRef,
  sucursalRef,
  sucursal,
}) => {
  const [open, setOpen] = useState(false);
  const dismissedStepRef = useRef<string | null>(null);
  const currentStepRef = useRef<GuideStep | null>(null);

  const getCurrentStep = useCallback((): GuideStep | null => {
    const steps: GuideStep[] = [
      {
        key: 'sucursal',
        title: 'Sucursal',
        description: 'Seleccione la sucursal contable.',
        target: () => sucursalRef.current,
      },
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
        key: 'suplidor',
        title: 'Suplidor',
        description: 'Debe elegir un suplidor para poder continuar.',
        target: () => suplidorRef.current,
      },
      {
        key: 'monto',
        title: 'Monto',
        description: 'Digite el Monto para poder continuar.',
        target: () => montoRef.current,
      },
      {
        key: 'ncf',
        title: 'NCF',
        description: 'Debe digitar un NCF.',
        target: () => ncfRef?.current || null,
      },
    ];

    if (!sucursal) return steps[0];
    if (!tipo) return steps[1];
    if (!concepto) return steps[2];
    if (suplidoresDisponibles && !suplidor) return steps[3];
    if (total === 0) return steps[4];
    if (!ncf) return steps[5];

    return null;
  }, [tipo, concepto, suplidor, total, ncf, suplidoresDisponibles, tipoRef, conceptoRef, suplidorRef, montoRef, ncfRef, sucursal, sucursalRef]);

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

export default FacturaSuplidorGuide;
