import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useCallback, useRef, useState } from 'react';
import GuidePopover from '../../components/GuidePopover/GuidePopover';
const CotizacionVentaGuide = ({ concepto, cliente, tieneProductos, almacen, detallesCount, conceptoRef, clienteRef, almacenRef, agregarFilaRef, sucursal, sucursalRef, }) => {
    const [open, setOpen] = useState(false);
    const dismissedStepRef = useRef(null);
    const currentStepRef = useRef(null);
    const getCurrentStep = useCallback(() => {
        const steps = [
            {
                key: 'sucursal',
                title: 'Sucursal',
                description: 'Seleccione la sucursal contable.',
                target: () => sucursalRef.current,
            },
            {
                key: 'concepto',
                title: 'Paso 1: Concepto',
                description: 'Seleccione un concepto para la cotización.',
                target: () => conceptoRef.current,
            },
            {
                key: 'cliente',
                title: 'Paso 2: Cliente',
                description: 'Seleccione el cliente. El RNC se mostrará automáticamente.',
                target: () => clienteRef.current,
            },
            {
                key: 'almacen',
                title: 'Almacén',
                description: 'Debe elegir un almacén para poder continuar.',
                target: () => almacenRef.current,
            },
            {
                key: 'productos',
                title: 'Paso 3: Productos',
                description: 'Agregue productos usando "Agregar fila" o "Buscar Producto".',
                target: () => agregarFilaRef.current,
            },
        ];
        if (!sucursal)
            return steps[0];
        if (!concepto)
            return steps[1];
        if (!cliente)
            return steps[2];
        if (tieneProductos && !almacen)
            return steps[3];
        if (detallesCount === 0)
            return steps[4];
        return null;
    }, [concepto, almacen, cliente, detallesCount, tieneProductos, sucursal, conceptoRef, almacenRef, clienteRef, agregarFilaRef, sucursalRef]);
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
export default CotizacionVentaGuide;
