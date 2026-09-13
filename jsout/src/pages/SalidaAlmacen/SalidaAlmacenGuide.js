import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
export const SalidaAlmacenGuide = ({ concepto, suplidor, almacen, detallesCount, conceptoRef, suplidorRef, almacenRef, agregarFilaRef, suplidoresDisponibles, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'concepto',
                title: 'Concepto',
                description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento, por ejemplo qué documento se va a generar, el almacén por defecto, o si va a generar asientos o no, etc.',
                target: () => conceptoRef.current,
            },
            {
                key: 'suplidor',
                title: 'Suplidor / Entidad',
                description: 'Debe elegir una entidad para poder continuar.',
                target: () => suplidorRef.current,
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
        if (!concepto)
            return steps[0];
        if (suplidoresDisponibles && !suplidor)
            return steps[1];
        if (!almacen)
            return steps[2];
        if (detallesCount === 0)
            return steps[3];
        return null;
    }, [concepto, almacen, suplidor, detallesCount, suplidoresDisponibles, conceptoRef, almacenRef, suplidorRef, agregarFilaRef]);
    currentStepRef.current = getCurrentStep();
    useEffect(() => {
        const current = getCurrentStep();
        if (current) {
            if (dismissedStepRef.current !== current.key) {
                setOpen(true);
            }
        }
        else {
            setOpen(false);
            dismissedStepRef.current = null;
        }
    }, [getCurrentStep]);
    const currentStep = getCurrentStep();
    if (!currentStep)
        return null;
    return (_jsx(GuidePopover, { title: currentStep.title, description: currentStep.description, targetElement: currentStep.target(), open: open, onClose: () => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; } }));
};
export default SalidaAlmacenGuide;
