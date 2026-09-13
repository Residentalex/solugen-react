import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Modal, Select, Typography, Divider, Input, Button, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
const { Text } = Typography;
const { TextArea } = Input;
export const MOTIVOS_DESAPLICAR = [
    'Datos Erróneos.',
    'Falta de Información.',
    'Falta de un Producto.',
    'Entrada Duplicada.',
    'Otro motivo...',
];
const ModalDesaplicar = ({ open, onClose, onConfirm, tituloDocumento, loading = false, }) => {
    const [selectedMotivo, setSelectedMotivo] = useState(null);
    const [otroMotivo, setOtroMotivo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Reset al cerrar
    useEffect(() => {
        if (!open) {
            setSelectedMotivo(null);
            setOtroMotivo('');
            setSubmitting(false);
        }
    }, [open]);
    const esOtroMotivo = selectedMotivo === 'Otro motivo...';
    const motivoValido = selectedMotivo
        ? esOtroMotivo
            ? otroMotivo.trim().length >= 5
            : true
        : false;
    const handleConfirm = async () => {
        if (!motivoValido || !selectedMotivo)
            return;
        setSubmitting(true);
        try {
            const motivoFinal = esOtroMotivo ? otroMotivo.trim() : selectedMotivo;
            await onConfirm(motivoFinal);
            onClose();
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCancel = () => {
        if (!submitting) {
            onClose();
        }
    };
    return (_jsxs(Modal, { title: _jsxs(Space, { children: [_jsx(ExclamationCircleOutlined, { style: { color: '#faad14' } }), _jsx("span", { children: "Desaplicar documento" })] }), open: open, onCancel: handleCancel, width: 480, destroyOnHidden: true, mask: { closable: false }, closable: !submitting, footer: _jsxs(Space, { children: [_jsx(Button, { disabled: submitting, onClick: handleCancel, children: "Cancelar" }), _jsx(Button, { type: "primary", danger: true, disabled: !motivoValido, loading: submitting, onClick: handleConfirm, children: "Confirmar" })] }), children: [tituloDocumento && (_jsx("div", { style: { marginBottom: 12 }, children: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: tituloDocumento }) })), _jsx(Divider, { style: { margin: '12px 0' } }), _jsx("div", { style: { marginBottom: 8 }, children: _jsx(Text, { children: "Selecciona el motivo de desaplicaci\u00F3n:" }) }), _jsx(Select, { style: { width: '100%' }, placeholder: "Seleccionar motivo...", value: selectedMotivo, onChange: (value) => {
                    setSelectedMotivo(value);
                    if (value !== 'Otro motivo...') {
                        setOtroMotivo('');
                    }
                }, options: MOTIVOS_DESAPLICAR.map((m) => ({ label: m, value: m })) }), esOtroMotivo && (_jsx("div", { style: { marginTop: 12 }, children: _jsx(TextArea, { rows: 3, maxLength: 200, showCount: true, placeholder: "Describa el motivo...", value: otroMotivo, onChange: (e) => setOtroMotivo(e.target.value) }) }))] }));
};
export default ModalDesaplicar;
