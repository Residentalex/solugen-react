import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Button, Tag, Spin, Alert, Row, Col, Empty, Tooltip, message, Typography, Modal, Form, Input, Select, } from 'antd';
import { ReloadOutlined, FileTextOutlined, CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import ReportesConfigEditor from './ReportesConfigEditor';
import './ReportesConfig.css';
const { Text } = Typography;
const TIPOS_PLANTILLA = [
    { value: 'TICKET_POS', label: 'Ticket POS (Factura POS)' },
    { value: 'TICKET_RI', label: 'Ticket RI (Recibo Ingreso)' },
    { value: 'TICKET_VSNT', label: 'Ticket VSNT (Voucher Visanet)' },
];
const TIPOS_DOC_TICKET = ['PV', 'RI', 'NC'];
/**
 * Configuración de plantillas de tickets ESC/POS (reportes config).
 * En pantallas grandes (xxl): lista como selector de cards (5/19) +
 * editor con vista previa a la derecha. En pantallas menores: apilado.
 */
const ReportesConfig = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [plantillas, setPlantillas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
    const [creando, setCreando] = useState(false);
    const [entdocAsignaciones, setEntdocAsignaciones] = useState({});
    const [form] = Form.useForm();
    useEffect(() => {
        setActiveModule('REPORTESCONFIG');
        setPageTitleOverride('Configuración de Plantillas de Tickets');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    const cargarPlantillas = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const data = await reportesConfigApi.obtenerListado();
            setPlantillas(data || []);
            const asignaciones = {};
            await Promise.all(TIPOS_DOC_TICKET.map(async (codigo) => {
                try {
                    const p = await reportesConfigApi.obtenerPorEntdoc(codigo);
                    asignaciones[codigo] = p?.plantillaId ?? null;
                }
                catch {
                    asignaciones[codigo] = null;
                }
            }));
            setEntdocAsignaciones(asignaciones);
        }
        catch (err) {
            setLoadingError(true);
            message.error(err?.response?.data?.errorMessage || 'Error al cargar las plantillas');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        cargarPlantillas();
    }, [cargarPlantillas]);
    const plantillaSeleccionada = useMemo(() => plantillas.find((p) => p.plantillaId === selectedId) || null, [plantillas, selectedId]);
    const handleRefresh = () => {
        cargarPlantillas();
    };
    const handleGuardado = useCallback(() => {
        cargarPlantillas();
    }, [cargarPlantillas]);
    const handleCrearPlantilla = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setCreando(true);
            await reportesConfigApi.crear({
                codigo: values.codigo.toUpperCase(),
                nombre: values.nombre,
                tipo: values.tipo,
            });
            message.success('Plantilla creada correctamente');
            setModalNuevoOpen(false);
            form.resetFields();
            cargarPlantillas();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al crear la plantilla');
        }
        finally {
            setCreando(false);
        }
    }, [form, cargarPlantillas]);
    const handleAsignarEntdoc = useCallback(async (plantillaId, entdocCodigo) => {
        try {
            const codigoAnterior = Object.entries(entdocAsignaciones).find(([, pid]) => pid === plantillaId)?.[0];
            if (codigoAnterior && codigoAnterior !== entdocCodigo) {
                await reportesConfigApi.asignarEntdoc(codigoAnterior, null);
                setEntdocAsignaciones((prev) => ({ ...prev, [codigoAnterior]: null }));
            }
            await reportesConfigApi.asignarEntdoc(entdocCodigo ?? '', entdocCodigo ? plantillaId : null);
            setEntdocAsignaciones((prev) => ({
                ...prev,
                ...(entdocCodigo ? { [entdocCodigo]: plantillaId } : {}),
            }));
            message.success(entdocCodigo ? `Asignada a ${entdocCodigo}` : 'Asignación removida');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al asignar la plantilla');
            cargarPlantillas();
        }
    }, [entdocAsignaciones, cargarPlantillas]);
    return (_jsxs(_Fragment, { children: [_jsxs(Row, { gutter: 16, children: [_jsx(Col, { xxl: 5, span: 24, children: _jsxs(Card, { className: "paces-card-erp paces-card-erp-padded", style: { borderRadius: 8, marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Text, { strong: true, style: { fontSize: 15, color: '#1a1d21', display: 'block' }, children: "Plantillas" }), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [plantillas.length, " plantilla", plantillas.length !== 1 ? 's' : ''] })] }), _jsx(Tooltip, { title: "Nueva plantilla", children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), type: "primary", onClick: () => setModalNuevoOpen(true) }) }), _jsx(Tooltip, { title: "Recargar", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh }) })] }), loadingError && (_jsx(Alert, { message: "Error al cargar plantillas", type: "error", showIcon: true, style: { marginBottom: 12 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), loading ? (_jsx("div", { className: "rc-plantillas-state", children: _jsx(Spin, {}) })) : plantillas.length === 0 ? (_jsx("div", { className: "rc-plantillas-state", children: _jsx(Empty, { description: "No hay plantillas" }) })) : (_jsx("div", { className: "rc-plantillas-lista", children: plantillas.map((p) => {
                                        const seleccionada = p.plantillaId === selectedId;
                                        return (_jsxs("div", { className: `rc-plantilla-card${seleccionada ? ' is-selected' : ''}`, onClick: () => setSelectedId(p.plantillaId), children: [_jsx("div", { className: "rc-plantilla-icon", children: _jsx(FileTextOutlined, { style: { fontSize: 20, color: '#fff' } }) }), _jsxs("div", { className: "rc-plantilla-info", children: [_jsx(Text, { strong: true, ellipsis: true, style: { fontSize: 14, color: '#1a1d21' }, children: p.nombre }), _jsxs("div", { className: "rc-plantilla-meta", children: [_jsx(Tag, { color: p.tieneConfig ? 'blue' : 'default', style: { margin: 0, fontSize: 11, lineHeight: '18px' }, children: p.tieneConfig ? 'Personalizada' : 'Predeterminada' }), _jsx(Text, { type: "secondary", style: { fontSize: 11, fontFamily: 'monospace' }, children: p.codigo })] }), _jsx("div", { style: { marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }, onClick: (e) => e.stopPropagation(), children: _jsx(Select, { size: "small", placeholder: "Sin asignar", style: { width: 150, fontSize: 11 }, value: Object.entries(entdocAsignaciones).find(([, pid]) => pid === p.plantillaId)?.[0], onChange: (val) => handleAsignarEntdoc(p.plantillaId, val ?? null), options: TIPOS_DOC_TICKET.map((cod) => ({ value: cod, label: cod })), allowClear: true }) })] }), seleccionada && _jsx(CheckCircleFilled, { className: "rc-plantilla-check" })] }, p.plantillaId));
                                    }) }))] }) }), _jsx(Col, { xxl: 19, span: 24, children: plantillaSeleccionada ? (_jsx(ReportesConfigEditor, { plantilla: plantillaSeleccionada, onVolver: () => setSelectedId(null), onGuardado: handleGuardado }, plantillaSeleccionada.plantillaId)) : (_jsx(Card, { className: "paces-card-erp paces-card-erp-padded", style: { borderRadius: 8, minHeight: 320 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '80px 0' }, children: [_jsx(Text, { type: "secondary", children: "Seleccione una plantilla de la lista para editarla" }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Las plantillas controlan el formato de los tickets ESC/POS (Factura POS y Recibo de Ingreso)." })] }) })) })] }), _jsx(Modal, { title: "Nueva plantilla", open: modalNuevoOpen, onOk: handleCrearPlantilla, onCancel: () => { setModalNuevoOpen(false); form.resetFields(); }, confirmLoading: creando, okText: "Crear", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "codigo", label: "Codigo", rules: [{ required: true, message: 'El codigo es obligatorio' }], children: _jsx(Input, { placeholder: "Ej: FPV_TICKET_PROMO", style: { textTransform: 'uppercase' } }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej: Factura POS Promocional" }) }), _jsx(Form.Item, { name: "tipo", label: "Tipo", rules: [{ required: true, message: 'El tipo es obligatorio' }], children: _jsx(Select, { options: TIPOS_PLANTILLA, placeholder: "Seleccione el tipo" }) })] }) })] }));
};
export default ReportesConfig;
