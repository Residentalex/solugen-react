import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Modal, Steps, Divider, Typography, Button, Space, DatePicker, Descriptions, Alert, Tooltip, Input, } from 'antd';
import { CalendarOutlined, FileTextOutlined, EditOutlined, WarningOutlined, InfoCircleOutlined, CopyOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
const { Text } = Typography;
const { TextArea } = Input;
export const MOTIVOS_ANULAR = [
    'Datos Erróneos.',
    'Falta de Información.',
    'Entrada Duplicada.',
    'Otros Motivos...',
];
const STEPS_ITEMS = [
    { title: 'Fecha' },
    { title: 'Motivo' },
    { title: 'Confirmar' },
];
const optionCardStyle = {
    border: '1px solid #d9d9d9',
    borderRadius: 8,
    padding: '12px 16px',
    cursor: 'pointer',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
};
function getSelectedCardStyle() {
    return {
        border: '1px solid #556ee6',
        background: '#f0f3ff',
    };
}
function getHoverCardStyle() {
    return {
        border: '1px solid #adb5bd',
        background: '#fafafa',
    };
}
function getDisabledCardStyle() {
    return {
        opacity: 0.45,
        cursor: 'not-allowed',
        background: '#f5f5f5',
    };
}
// Format date helper for output: yyyyMMddHHmmss with 000000 as time
function formatFechaOutput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00`;
}
function formatDateLegible(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const ModalAnular = ({ open, onClose, onConfirm, documento, fechaDocumento, fechaMinima, periodoCerrado = false, }) => {
    const [paso, setPaso] = useState(1);
    const [opcionFecha, setOpcionFecha] = useState(null);
    const [fechaPersonalizada, setFechaPersonalizada] = useState(null);
    const [opcionMotivo, setOpcionMotivo] = useState(null);
    const [motivoLibre, setMotivoLibre] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Estados hover para las option cards
    const [hoveredFecha, setHoveredFecha] = useState(null);
    const [hoveredMotivo, setHoveredMotivo] = useState(null);
    // Reset al cerrar
    useEffect(() => {
        if (!open) {
            setPaso(1);
            setOpcionFecha(null);
            setFechaPersonalizada(null);
            setOpcionMotivo(null);
            setMotivoLibre('');
            setSubmitting(false);
            setHoveredFecha(null);
            setHoveredMotivo(null);
        }
    }, [open]);
    // ===== Fecha helpers =====
    const hoy = dayjs();
    const fechaDocDayjs = dayjs(fechaDocumento);
    const fechaMinDayjs = fechaMinima ? dayjs(fechaMinima) : undefined;
    const fechaSeleccionada = opcionFecha === 'hoy'
        ? hoy
        : opcionFecha === 'documento'
            ? fechaDocDayjs
            : opcionFecha === 'otra'
                ? fechaPersonalizada
                : null;
    const fechaHabilitada = (current) => {
        if (fechaMinDayjs && current.isBefore(fechaMinDayjs, 'day'))
            return true; // disabled
        if (current.isAfter(hoy, 'day'))
            return true; // disabled
        return false;
    };
    // ===== Motivo helpers =====
    const esOtrosMotivos = opcionMotivo === 'Otros Motivos...';
    const motivoValido = opcionMotivo
        ? esOtrosMotivos
            ? motivoLibre.trim().length >= 5
            : true
        : false;
    const pasoFechaValido = opcionFecha !== null && (opcionFecha !== 'otra' || (fechaPersonalizada !== null));
    // ===== Handlers =====
    const handleSiguiente = () => {
        if (paso === 1 && pasoFechaValido) {
            setPaso(2);
        }
        else if (paso === 2 && motivoValido && esOtrosMotivos) {
            setPaso(3);
        }
    };
    const handleAnterior = () => {
        if (paso === 2)
            setPaso(1);
        else if (paso === 3)
            setPaso(2);
    };
    const handleMotivoClick = (motivo) => {
        setOpcionMotivo(motivo);
        if (motivo !== 'Otros Motivos...') {
            // Avanza automáticamente al paso 3 con setTimeout 150ms
            setTimeout(() => {
                setPaso(3);
            }, 150);
        }
    };
    const handleConfirm = async () => {
        if (!fechaSeleccionada || !opcionMotivo)
            return;
        setSubmitting(true);
        try {
            const motivoFinal = esOtrosMotivos ? motivoLibre.trim() : opcionMotivo;
            const fechaStr = formatFechaOutput(fechaSeleccionada.toDate());
            await onConfirm({ fecha: fechaStr, motivo: motivoFinal });
            onClose();
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };
    // ===== Option Card render helper =====
    const renderFechaCard = (opcion, icon, titulo, subtexto, disabled, tooltipTitle) => {
        const isSelected = opcionFecha === opcion;
        const isHovered = hoveredFecha === opcion;
        const cardStyle = {
            ...optionCardStyle,
            ...(disabled ? getDisabledCardStyle() : {}),
            ...(isSelected ? getSelectedCardStyle() : {}),
            ...(!disabled && isHovered && !isSelected ? getHoverCardStyle() : {}),
        };
        const content = (_jsxs("div", { style: cardStyle, onClick: disabled ? undefined : () => { setOpcionFecha(opcion); if (opcion !== 'otra')
                setFechaPersonalizada(null); }, onMouseEnter: disabled ? undefined : () => setHoveredFecha(opcion), onMouseLeave: disabled ? undefined : () => setHoveredFecha(null), children: [_jsx("span", { style: { fontSize: 18 }, children: icon }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 500 }, children: titulo }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: subtexto })] })] }));
        if (disabled && tooltipTitle) {
            return _jsx(Tooltip, { title: tooltipTitle, children: content }, opcion);
        }
        return content;
    };
    const renderMotivoCard = (motivo, icon) => {
        const isSelected = opcionMotivo === motivo;
        const isHovered = hoveredMotivo === motivo;
        const cardStyle = {
            ...optionCardStyle,
            ...(isSelected ? getSelectedCardStyle() : {}),
            ...(!isSelected && isHovered ? getHoverCardStyle() : {}),
        };
        return (_jsxs("div", { style: cardStyle, onClick: () => handleMotivoClick(motivo), onMouseEnter: () => setHoveredMotivo(motivo), onMouseLeave: () => setHoveredMotivo(null), children: [_jsx("span", { style: { fontSize: 18 }, children: icon }), _jsx("div", { children: _jsx("div", { style: { fontWeight: 500 }, children: motivo }) })] }, motivo));
    };
    // ===== Render paso 1: Fecha =====
    const renderPasoFecha = () => (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsx(Text, { strong: true, children: "Selecciona la fecha de anulaci\u00F3n:" }) }), renderFechaCard('hoy', _jsx(CalendarOutlined, {}), 'Fecha del Día', `Hoy, ${hoy.format('DD/MM/YYYY')}`, false), renderFechaCard('documento', _jsx(FileTextOutlined, {}), 'Fecha del Documento', formatDateLegible(fechaDocumento), periodoCerrado, 'El período contable está cerrado para esta fecha'), renderFechaCard('otra', _jsx(EditOutlined, {}), 'Otra Fecha', 'Selecciona una fecha específica', false), opcionFecha === 'otra' && (_jsx("div", { style: { marginTop: 12, marginLeft: 44 }, children: _jsx(DatePicker, { style: { width: '100%' }, format: "DD/MM/YYYY", value: fechaPersonalizada, onChange: (date) => setFechaPersonalizada(date), disabledDate: fechaHabilitada, placeholder: "Seleccionar fecha..." }) })), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Button, { disabled: submitting, onClick: handleClose, children: "Cancelar" }), _jsx(Button, { type: "primary", disabled: !pasoFechaValido, onClick: handleSiguiente, children: "Siguiente \u2192" })] })] }));
    // ===== Render paso 2: Motivo =====
    const renderPasoMotivo = () => (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsx(Text, { strong: true, children: "Selecciona el motivo de anulaci\u00F3n:" }) }), renderMotivoCard('Datos Erróneos.', _jsx(WarningOutlined, {})), renderMotivoCard('Falta de Información.', _jsx(InfoCircleOutlined, {})), renderMotivoCard('Entrada Duplicada.', _jsx(CopyOutlined, {})), renderMotivoCard('Otros Motivos...', _jsx(EditOutlined, {})), esOtrosMotivos && (_jsx("div", { style: { marginTop: 12 }, children: _jsx(TextArea, { rows: 3, maxLength: 200, showCount: true, placeholder: "Describa el motivo...", value: motivoLibre, onChange: (e) => setMotivoLibre(e.target.value) }) })), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Button, { onClick: handleAnterior, children: "\u2190 Anterior" }), _jsxs(Space, { children: [_jsx(Button, { disabled: submitting, onClick: handleClose, children: "Cancelar" }), esOtrosMotivos && (_jsx(Button, { type: "primary", disabled: !motivoValido, onClick: handleSiguiente, children: "Siguiente \u2192" }))] })] })] }));
    // ===== Render paso 3: Confirmación =====
    const getMotivoLegible = () => {
        if (!opcionMotivo)
            return '-';
        if (esOtrosMotivos)
            return motivoLibre.trim() || '-';
        return opcionMotivo;
    };
    const renderPasoConfirmacion = () => (_jsxs("div", { children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 1, style: { marginBottom: 16 }, children: [_jsx(Descriptions.Item, { label: "Documento", children: documento }), _jsx(Descriptions.Item, { label: "Fecha", children: fechaSeleccionada ? formatDateLegible(fechaSeleccionada.toISOString()) : '-' }), _jsx(Descriptions.Item, { label: "Motivo", children: getMotivoLegible() })] }), _jsx(Alert, { message: "Esta acci\u00F3n no se puede deshacer.", type: "warning", showIcon: true }), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Button, { onClick: handleAnterior, children: "\u2190 Anterior" }), _jsxs(Space, { children: [_jsx(Button, { disabled: submitting, onClick: handleClose, children: "Cancelar" }), _jsx(Button, { type: "primary", danger: true, loading: submitting, onClick: handleConfirm, children: "\uD83D\uDEAB  Confirmar Anulaci\u00F3n" })] })] })] }));
    // ===== Render step content =====
    const renderStepContent = () => {
        switch (paso) {
            case 1: return renderPasoFecha();
            case 2: return renderPasoMotivo();
            case 3: return renderPasoConfirmacion();
            default: return null;
        }
    };
    return (_jsxs(Modal, { title: "Anular documento", open: open, onCancel: handleClose, width: 560, destroyOnHidden: true, mask: { closable: false }, closable: !submitting, footer: null, children: [_jsx(Steps, { current: paso - 1, items: STEPS_ITEMS }), _jsx(Divider, { style: { margin: '16px 0' } }), renderStepContent()] }));
};
export default ModalAnular;
