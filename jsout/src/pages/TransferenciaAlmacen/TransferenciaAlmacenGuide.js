import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
export const TransferenciaAlmacenGuide = ({ concepto, almacenOrigen, almacenDestino, detallesCount, conceptoRef, almacenOrigenRef, almacenDestinoRef, agregarFilaRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'concepto',
                title: 'Paso 1: Concepto',
                description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
                target: () => conceptoRef.current,
            },
            {
                key: 'almacenOrigen',
                title: 'Paso 2: Almacén Origen',
                description: 'Seleccione el almacén desde donde saldrá la mercancía.',
                target: () => almacenOrigenRef.current,
            },
            {
                key: 'almacenDestino',
                title: 'Paso 3: Almacén Destino',
                description: 'Seleccione el almacén de destino. Debe ser diferente al almacén origen.',
                target: () => almacenDestinoRef.current,
            },
            {
                key: 'productos',
                title: 'Paso 4: Productos',
                description: 'Agregue productos al documento usando el botón "Agregar fila" o "Buscar Producto".',
                target: () => agregarFilaRef.current,
            },
        ];
        if (!concepto)
            return steps[0];
        if (!almacenOrigen)
            return steps[1];
        if (!almacenDestino)
            return steps[2];
        if (detallesCount === 0)
            return steps[3];
        return null;
    }, [concepto, almacenOrigen, almacenDestino, detallesCount, conceptoRef, almacenOrigenRef, almacenDestinoRef, agregarFilaRef]);
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
