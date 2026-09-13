import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
export const DistribucionBalanceGuide = ({ tipo, concepto, entidad, detallesCount, tipoRef, conceptoRef, entidadRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'tipo',
                title: 'Paso 1: Tipo',
                description: 'Seleccione el tipo de documento.',
                target: () => tipoRef.current,
            },
            {
                key: 'concepto',
                title: 'Paso 2: Concepto',
                description: 'Debe elegir un concepto para poder continuar. Los conceptos determinan ciertas acciones del documento.',
                target: () => conceptoRef.current,
            },
            {
                key: 'entidad',
                title: 'Paso 3: Entidad',
                description: 'Seleccione la entidad asociada a la distribución de balance.',
                target: () => entidadRef.current,
            },
            {
                key: 'detalles',
                title: 'Paso 4: Débitos y Créditos',
                description: 'Agregue los montos a distribuir en las pestañas de Débitos y Créditos.',
                target: () => null,
            },
        ];
        if (!tipo)
            return steps[0];
        if (!concepto)
            return steps[1];
        if (!entidad)
            return steps[2];
        if (detallesCount === 0)
            return steps[3];
        return null;
    }, [tipo, concepto, entidad, detallesCount, tipoRef, conceptoRef, entidadRef]);
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
export default DistribucionBalanceGuide;
