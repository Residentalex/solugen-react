import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
export const ReciboIngresoGuide = ({ tipo, concepto, entidad, total, transaccionesCount, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'tipo',
                title: 'Paso 1: Tipo',
                description: 'Debe elegir un tipo de documento para continuar.',
                target: () => tipoRef.current,
            },
            {
                key: 'concepto',
                title: 'Paso 2: Concepto',
                description: 'Seleccione un concepto. Las opciones dependen del tipo seleccionado.',
                target: () => conceptoRef.current,
            },
            {
                key: 'entidad',
                title: 'Paso 3: Entidad',
                description: 'Seleccione la entidad (cliente) asociada al recibo de ingreso.',
                target: () => entidadRef.current,
            },
            {
                key: 'monto',
                title: 'Paso 4: Monto',
                description: 'Ingrese el monto total del recibo de ingreso.',
                target: () => totalRef.current,
            },
            {
                key: 'documentos',
                title: 'Paso 5: Documentos',
                description: 'Agregue los documentos/pagos asociados al recibo de ingreso.',
                target: () => documentosRef.current,
            },
        ];
        if (!tipo)
            return steps[0];
        if (!concepto)
            return steps[1];
        if (!entidad)
            return steps[2];
        if (!total || total === 0)
            return steps[3];
        if (transaccionesCount === 0)
            return steps[4];
        return null;
    }, [tipo, concepto, entidad, total, transaccionesCount, tipoRef, conceptoRef, entidadRef, totalRef, documentosRef]);
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
    useEffect(() => {
        if (!open)
            return;
        const handleClickOutside = (e) => {
            const target = e.target;
            if (target.closest('.ant-popover'))
                return;
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
    if (!currentStep)
        return null;
    const targetElement = currentStep.target();
    if (!targetElement)
        return null;
    const rect = targetElement.getBoundingClientRect();
    return createPortal(_jsx(Popover, { open: open, onOpenChange: (visible) => {
            if (!visible) {
                setOpen(false);
                dismissedStepRef.current = currentStep.key;
            }
        }, title: currentStep.title, content: currentStep.description, placement: "top", trigger: [], rootClassName: "guide-popover", children: _jsx("span", { style: {
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                pointerEvents: 'none',
                zIndex: -1,
            } }) }), document.body);
};
export default ReciboIngresoGuide;
