import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Modal, DatePicker, Typography, message, Space, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';
const { Text } = Typography;
// ===== Helpers =====
function formatDateDisplay(dateStr) {
    if (!dateStr)
        return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    catch {
        return dateStr;
    }
}
function formatDateISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
}
const CierreReaperturaModal = ({ open, sucursal, fechaCierreActual, codigoUsuario, onClose, onSuccess, }) => {
    const [fechaNueva, setFechaNueva] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);
    // Reset al abrir
    useEffect(() => {
        if (open) {
            setFechaNueva(null);
            setError(null);
        }
    }, [open]);
    const handleConfirmar = async () => {
        if (!fechaNueva) {
            setError('Debe seleccionar una fecha');
            return;
        }
        setGuardando(true);
        setError(null);
        try {
            const fechaNuevaStr = fechaNueva.toDate().toISOString();
            const fechaAnterior = fechaCierreActual
                ? new Date(fechaCierreActual).toISOString()
                : new Date().toISOString();
            const razon = 'Reapertura manual de cierre de inventario';
            await cierreInventarioApi.reaperturar(sucursal, fechaNuevaStr, fechaAnterior, razon, codigoUsuario);
            message.success('Período reaperturado exitosamente');
            onSuccess();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al reaperturar período';
            setError(msg);
            message.error(msg);
        }
        finally {
            setGuardando(false);
        }
    };
    return (_jsx(Modal, { title: _jsxs(Space, { children: [_jsx(LockOutlined, { style: { color: '#4a7db5' } }), _jsx("span", { children: "Reaperturar Cierre de Inventario" })] }), open: open, onCancel: onClose, footer: null, width: 420, destroyOnHidden: true, centered: true, children: _jsxs("div", { style: { padding: '8px 0' }, children: [_jsxs("div", { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                        padding: '12px 16px',
                        background: 'var(--paces-hover-bg)',
                        borderRadius: 6,
                    }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Fecha de cierre actual" }), _jsx(Text, { strong: true, style: { fontSize: 15, color: 'var(--paces-primary)' }, children: formatDateDisplay(fechaCierreActual) })] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx(Text, { strong: true, style: { fontSize: 13, display: 'block', marginBottom: 8 }, children: "Seleccionar nueva fecha de cierre" }), _jsx(DatePicker, { style: { width: '100%' }, value: fechaNueva, onChange: (date) => {
                                setFechaNueva(date);
                                setError(null);
                            }, format: "DD/MM/YYYY", placeholder: "Seleccionar fecha", disabledDate: (current) => current && current > dayjs().endOf('day'), size: "large" })] }), error && (_jsx(Text, { type: "danger", style: { fontSize: 12, display: 'block', marginTop: 8 }, children: error })), _jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block', marginTop: 8, marginBottom: 16 }, children: "La reapertura permitir\u00E1 modificar documentos en el per\u00EDodo seleccionado." }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--paces-border)', paddingTop: 16 }, children: [_jsx(Button, { onClick: onClose, disabled: guardando, children: "Cancelar" }), _jsx(Button, { type: "primary", onClick: handleConfirmar, loading: guardando, style: { backgroundColor: '#4a7db5', borderColor: '#4a7db5' }, children: "Confirmar" })] })] }) }));
};
export default CierreReaperturaModal;
