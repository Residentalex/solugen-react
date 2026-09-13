import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
const EntradaAlmacenGuide = ({ concepto, suplidor, ordenCompra, almacen, detallesCount, conceptoRef, suplidorRef, ordenCompraRef, almacenRef, agregarFilaRef, ncf, ncfRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    // Determinar el paso actual según la lógica del escritorio
    const currentStep = useMemo(() => {
        const steps = [
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
        if (!concepto)
            return steps[0];
        if (!suplidor)
            return steps[1];
        // Solo pedir OC si el suplidor requiere ORC
        if (suplidor.requiereORC && !ordenCompra)
            return steps[2];
        if (!almacen)
            return steps[3];
        // Solo pedir productos manuales si no hay OC seleccionada
        if (!ordenCompra && detallesCount === 0)
            return steps[4];
        // NCF requerido si el concepto genera RDE
        if (concepto?.docAGenerar === 'RDE' && !ncf)
            return steps[5];
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
        }
        else {
            setOpen(false);
            dismissedStepRef.current = null;
        }
    }, [currentStep?.key]);
    if (!currentStep)
        return null;
    return (_jsx(GuidePopover, { title: currentStep.title, description: currentStep.description, targetElement: currentStep.target(), open: open, onClose: () => { setOpen(false); dismissedStepRef.current = currentStepRef.current?.key || ''; } }));
};
export default EntradaAlmacenGuide;
