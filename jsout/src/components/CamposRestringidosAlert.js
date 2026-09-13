import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Alert } from 'antd';
/**
 * Componente que muestra un Alert warning sobre campos restringidos
 * (modificaPrecio / modificaDescripcion) con botón X para cerrarlo.
 * Se oculta permanentemente al cerrar.
 */
const CamposRestringidosAlert = ({ modificaPrecio = true, modificaDescripcion = true, visible: externalVisible, style, }) => {
    const [internalVisible, setInternalVisible] = useState(true);
    // Si hay control externo, usamos ese; si no, usamos el interno
    const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;
    if (!isVisible)
        return null;
    // Construir mensaje dinámico
    const mensajes = [];
    if (modificaPrecio === false) {
        mensajes.push('Este documento no permite modificar precios.');
    }
    if (modificaDescripcion === false) {
        mensajes.push('Este documento no permite modificar descripciones.');
    }
    // Siempre agregar la nota final
    mensajes.push('Los campos restringidos se mostrarán como solo lectura.');
    return (_jsx(Alert, { type: "warning", showIcon: true, closable: true, onClose: () => setInternalVisible(false), message: mensajes.join(' '), style: { marginBottom: 12, ...style } }));
};
export default CamposRestringidosAlert;
