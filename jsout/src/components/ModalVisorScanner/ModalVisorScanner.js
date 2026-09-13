import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import { Modal, Spin } from 'antd';
/**
 * Visor de documento escaneado (blob URL en iframe).
 *
 * DECISIÓN DE CLEANUP (Opción A): el componente centraliza el revoke de la URL.
 * Al pasar `open` de true a false, revoca la última URL recibida (vía ref, para
 * no depender de que `url` siga poblada cuando el padre la limpia en onClose) y
 * llama a `onClose`. El padre solo cierra su estado (modal + url), sin revocar.
 * Esto garantiza un único revoke y cero cambio de comportamiento respecto al
 * onCancel original de cada copia.
 */
const ModalVisorScanner = ({ open, titulo, url, loading, onClose }) => {
    // Conserva la última URL no nula para poder revocarla al cerrar aunque el
    // padre limpie `url` en el mismo render que cierra el modal.
    const urlRef = useRef(null);
    useEffect(() => {
        if (url)
            urlRef.current = url;
    }, [url]);
    useEffect(() => {
        if (!open && urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        }
    }, [open]);
    return (_jsx(Modal, { title: titulo, open: open, onCancel: onClose, width: "80%", style: { top: 20 }, footer: null, destroyOnHidden: true, children: loading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : url ? (_jsx("iframe", { src: url, style: { width: '100%', height: '70vh', border: 'none' }, title: "Scanner" })) : (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) }));
};
export default ModalVisorScanner;
