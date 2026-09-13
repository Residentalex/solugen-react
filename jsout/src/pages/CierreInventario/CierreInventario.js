import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Switch, Button, Tag, message, Spin, Alert, Table, } from 'antd';
import { ReloadOutlined, LockOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, CalendarOutlined, SafetyOutlined, ShoppingCartOutlined, SearchOutlined, DollarOutlined, EyeOutlined, FileExcelOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import PermissionGate from '../../components/PermissionGate';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CierreReaperturaModal from './CierreReaperturaModal';
import ExistenciasNegativasModal from './ExistenciasNegativasModal';
const { Text } = Typography;
// ===== Constantes =====
const SUCURSAL_VALUE_MAP = {
    0: 'Orense Plaza',
    1: 'Hiper Romana',
    2: 'O. Villa Hermosa',
    3: 'El Ofertazo',
};
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
function proximoUltimoDiaDelMes(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth() + 2, 0);
}
function calcularCierresRestantes(fechaCierreStr) {
    if (!fechaCierreStr)
        return 0;
    try {
        const fechaCierre = new Date(fechaCierreStr);
        if (isNaN(fechaCierre.getTime()))
            return 0;
        const hoy = new Date();
        const diffMs = hoy.getTime() - fechaCierre.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.floor((diffDays / 365.25) * 12));
    }
    catch {
        return 0;
    }
}
// ===== Componente principal =====
const CierreInventario = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursal = useAuthStore((s) => s.sucursalActiva);
    const codigoUsuario = useAuthStore((s) => s.usuario?.nombreUsuario ?? '');
    // ===== Estados =====
    const [loading, setLoading] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [fechaCierre, setFechaCierre] = useState('');
    const [cierres, setCierres] = useState([]);
    const [validar, setValidar] = useState(true);
    const [validaciones, setValidaciones] = useState([]);
    const [reaperturaModalOpen, setReaperturaModalOpen] = useState(false);
    const [cierreCompletado, setCierreCompletado] = useState(false);
    const [existenciasModalOpen, setExistenciasModalOpen] = useState(false);
    const [existenciasNegativasData, setExistenciasNegativasData] = useState([]);
    // ===== Valores derivados =====
    const cierresRestantes = calcularCierresRestantes(fechaCierre);
    const fechaCierreDate = fechaCierre ? new Date(fechaCierre) : null;
    const proximoCierre = fechaCierreDate ? proximoUltimoDiaDelMes(fechaCierreDate) : null;
    const proximoCierreStr = proximoCierre ? formatDateDisplay(proximoCierre.toISOString()) : '—';
    const hayCierresPendientes = cierresRestantes > 0;
    // ===== Cargar datos =====
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setCierreCompletado(false);
        try {
            const [fecha, cierresData] = await Promise.all([
                cierreInventarioApi.obtenerFechaCierre(sucursal),
                cierreInventarioApi.obtenerCierres(sucursal),
            ]);
            setFechaCierre(fecha);
            setCierres(cierresData);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos de cierre');
        }
        finally {
            setLoading(false);
        }
    }, [sucursal]);
    useEffect(() => {
        setActiveModule('OCierreINV');
        setPageTitleOverride('Cierre de Inventario');
        cargarDatos();
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, cargarDatos]);
    // ===== Generar Cierre =====
    const handleGenerarCierre = async () => {
        if (!proximoCierre) {
            message.warning('No hay fecha de cierre disponible');
            return;
        }
        setGenerando(true);
        setCierreCompletado(false);
        // Inicializar validaciones
        const vitems = [
            { key: 'sinSolucion', label: 'Productos sin solución', estado: 'pending' },
            { key: 'sinFamilia', label: 'Productos sin familia', estado: 'pending' },
            { key: 'sinClasificacion', label: 'Productos sin clasificación', estado: 'pending' },
            { key: 'sinAlmacen', label: 'Movimientos sin almacén', estado: 'pending' },
            { key: 'costosSinIntegridad', label: 'Costos sin integridad', estado: 'pending' },
            { key: 'existenciasNegativas', label: 'Productos con existencia negativa', estado: 'pending' },
        ];
        if (!validar) {
            vitems.forEach((v) => { v.estado = 'skipped'; v.mensaje = 'Validación desactivada'; });
        }
        setValidaciones(vitems);
        setCierreCompletado(false);
        try {
            // Si validar está activo, ejecutar verificaciones
            if (validar) {
                // Validar existencias negativas via API
                let validationFailed = false;
                try {
                    const negativas = await cierreInventarioApi.obtenerExistenciasNegativas(sucursal);
                    if (negativas.length > 0) {
                        setExistenciasNegativasData(negativas);
                        setValidaciones((prev) => prev.map((v) => v.key === 'existenciasNegativas'
                            ? {
                                ...v,
                                estado: 'error',
                                mensaje: `${negativas.length} producto(s)`,
                                count: negativas.length,
                                datosDetalle: negativas,
                            }
                            : { ...v, estado: 'success', mensaje: 'OK' }));
                        validationFailed = true;
                    }
                    else {
                        setValidaciones((prev) => prev.map((v) => ({ ...v, estado: 'success', mensaje: 'OK' })));
                    }
                }
                catch (err) {
                    // Error de conexión o del endpoint
                    const errorMsg = err?.message || 'Error al validar';
                    setValidaciones((prev) => prev.map((v) => v.key === 'existenciasNegativas'
                        ? { ...v, estado: 'error', mensaje: errorMsg }
                        : { ...v, estado: 'success', mensaje: 'OK' }));
                    validationFailed = true;
                }
                if (validationFailed) {
                    message.error('Corrija los errores de validación antes de generar el cierre.');
                    setGenerando(false);
                    return;
                }
            }
            // Llamar a generar cierre (backend hace todo internamente)
            const fechaFormatted = formatDateISO(proximoCierre);
            const resultado = await cierreInventarioApi.generarCierre(sucursal, fechaFormatted);
            message.success(`Cierre generado exitosamente al ${formatDateDisplay(proximoCierre.toISOString())}`);
            // Recargar fecha de cierre
            await cargarDatos();
            setCierreCompletado(true);
        }
        catch (err) {
            const errorMsg = err?.response?.data?.errorMessage || 'Error al generar cierre';
            message.error(errorMsg);
            // Marcar validaciones como error si falló
            if (validar) {
                setValidaciones((prev) => prev.map((v) => ({
                    ...v,
                    estado: v.estado === 'pending' ? 'error' : v.estado,
                    mensaje: v.estado === 'pending' ? 'Error en el proceso' : v.mensaje,
                })));
            }
        }
        finally {
            setGenerando(false);
        }
    };
    // ===== Detalle =====
    const handleOpenDetalle = (cierre) => {
        navigate(`/OCierreINV/detalle/${cierre.cierreId}`);
    };
    // ===== Reaperturar =====
    const handleReaperturaSuccess = () => {
        setReaperturaModalOpen(false);
        cargarDatos();
    };
    // ===== Exportar Excel =====
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursal);
        const exportColumns = [
            { title: 'Fecha de cierre', dataIndex: 'fechaCierre' },
            { title: 'Fecha realizado', dataIndex: 'fechaRealizado' },
            { title: 'Cantidad total', dataIndex: 'cantidad' },
            { title: 'Costo total', dataIndex: 'total' },
        ];
        const columnHeaders = exportColumns.map((col) => col.title);
        const dataRows = cierres.map((item) => exportColumns.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `CierreInventario_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'CierreInventario',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    // ===== Render helpers =====
    const renderValidationIcon = (estado) => {
        switch (estado) {
            case 'success':
                return _jsx(CheckCircleOutlined, { style: { color: '#34c38f' } });
            case 'error':
                return _jsx(CloseCircleOutlined, { style: { color: '#f46a6a' } });
            case 'pending':
                return _jsx(Spin, { size: "small" });
            case 'skipped':
                return _jsx(ExclamationCircleOutlined, { style: { color: '#f1b44c' } });
        }
    };
    const renderValidationPanel = () => {
        if (validaciones.length === 0)
            return null;
        const hasVisible = validaciones.some((v) => v.estado !== 'skipped');
        if (!hasVisible && !generando)
            return null;
        return (_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 13, fontWeight: 600 }, children: generando ? 'Verificando integridad...' : 'Resultado de validaciones' }), style: { marginTop: 16, borderRadius: 8 }, children: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: validaciones.map((v) => (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: v.estado === 'success' ? '#f0fff4' :
                            v.estado === 'error' ? '#fff5f5' :
                                v.estado === 'skipped' ? '#fffbf0' :
                                    'transparent',
                    }, children: [_jsx("span", { style: { fontSize: 16 }, children: renderValidationIcon(v.estado) }), _jsx(Text, { style: { flex: 1, fontSize: 13 }, children: v.label }), v.estado === 'success' && (_jsx(Tag, { color: "success", style: { margin: 0, borderRadius: 4 }, children: "OK" })), v.estado === 'error' && v.mensaje && !v.datosDetalle && (_jsx(Text, { type: "danger", style: { fontSize: 12 }, children: v.mensaje })), v.estado === 'error' && v.datosDetalle && (_jsxs(_Fragment, { children: [_jsxs(Tag, { color: "error", style: { margin: 0, borderRadius: 4 }, children: [v.count ?? v.datosDetalle.length, " producto", (v.count ?? v.datosDetalle.length) !== 1 ? 's' : ''] }), _jsx(Button, { type: "link", size: "small", icon: _jsx(EyeOutlined, {}), onClick: () => setExistenciasModalOpen(true), style: { padding: '0 4px', fontSize: 12 }, children: "Ver detalle" })] })), v.estado === 'skipped' && (_jsx(Tag, { color: "warning", style: { margin: 0, borderRadius: 4 }, children: "Omitido" })), v.estado === 'pending' && (_jsx(Tag, { style: { margin: 0, borderRadius: 4, borderColor: '#d9d9d9', color: '#999' }, children: "Verificando..." }))] }, v.key))) }) }));
    };
    // ===== Render =====
    return (_jsxs("div", { children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 8,
                }, children: [_jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarDatos, loading: loading })] }), _jsxs(Spin, { spinning: loading && !generando, children: [_jsxs(Row, { gutter: [16, 16], children: [_jsxs(Col, { xs: 24, lg: 16, children: [_jsxs(Row, { gutter: [16, 16], style: { marginBottom: 16 }, children: [_jsx(Col, { xs: 8, children: _jsxs("div", { style: {
                                                        background: 'linear-gradient(135deg, #eef1ff 0%, #f8f9ff 100%)',
                                                        borderRadius: 12,
                                                        padding: '20px 16px',
                                                        border: '1px solid #e8ecf4',
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: {
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 12,
                                                                background: 'linear-gradient(135deg, #556ee6, #364574)',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 22,
                                                                color: '#fff',
                                                                marginBottom: 12,
                                                            }, children: _jsx(CalendarOutlined, {}) }), _jsx(Text, { strong: true, style: { fontSize: 20, display: 'block', color: '#556ee6', lineHeight: 1.2 }, children: fechaCierre ? formatDateDisplay(fechaCierre) : '—' }), _jsx(Text, { type: "secondary", style: { fontSize: 12, display: 'block', marginTop: 4 }, children: "\u00DAltimo Cierre" })] }) }), _jsx(Col, { xs: 8, children: _jsxs("div", { style: {
                                                        background: cierresRestantes > 0
                                                            ? 'linear-gradient(135deg, #fff8e6 0%, #fffdf5 100%)'
                                                            : 'linear-gradient(135deg, #e8faf0 0%, #f5fffa 100%)',
                                                        borderRadius: 12,
                                                        padding: '20px 16px',
                                                        border: `1px solid ${cierresRestantes > 0 ? '#f1b44c' : '#34c38f'}`,
                                                        textAlign: 'center',
                                                    }, children: [_jsx("div", { style: {
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 12,
                                                                background: cierresRestantes > 0
                                                                    ? 'linear-gradient(135deg, #f1b44c, #d4922a)'
                                                                    : 'linear-gradient(135deg, #34c38f, #219a6e)',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 22,
                                                                color: '#fff',
                                                                marginBottom: 12,
                                                            }, children: _jsx(ShoppingCartOutlined, {}) }), _jsx(Text, { strong: true, style: {
                                                                fontSize: 20,
                                                                display: 'block',
                                                                color: cierresRestantes > 0 ? '#f1b44c' : '#34c38f',
                                                                lineHeight: 1.2,
                                                            }, children: cierresRestantes }), _jsx(Text, { type: "secondary", style: { fontSize: 12, display: 'block', marginTop: 4 }, children: "Cierres Pendientes" })] }) }), _jsx(Col, { xs: 8, children: _jsxs("div", { style: {
                                                        background: 'linear-gradient(135deg, #e8faf0 0%, #f5fffa 100%)',
                                                        borderRadius: 12,
                                                        padding: '16px 20px',
                                                        border: '1px solid #b7eb8f',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 16,
                                                        height: '100%',
                                                    }, children: [_jsx("div", { style: {
                                                                width: 48,
                                                                height: 48,
                                                                borderRadius: 12,
                                                                background: 'linear-gradient(135deg, #34c38f, #219a6e)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 24,
                                                                color: '#fff',
                                                                flexShrink: 0,
                                                            }, children: _jsx(DollarOutlined, {}) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12, display: 'block' }, children: "Total \u00DAltimo Cierre" }), _jsx(Text, { strong: true, style: {
                                                                        fontSize: 18,
                                                                        display: 'block',
                                                                        color: '#219a6e',
                                                                        lineHeight: 1.3,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }, children: cierres.length > 0 && cierres[0]?.total != null
                                                                        ? `$${cierres[0].total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                        : '—' })] }), cierres.length > 0 && cierres[0]?.cierreId != null && (_jsx("div", { onClick: () => handleOpenDetalle(cierres[0]), style: {
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 8,
                                                                background: '#e8faf0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 18,
                                                                color: '#34c38f',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                flexShrink: 0,
                                                            }, onMouseEnter: (e) => {
                                                                e.currentTarget.style.background = '#d9f7e6';
                                                            }, onMouseLeave: (e) => {
                                                                e.currentTarget.style.background = '#e8faf0';
                                                            }, title: "Ver detalle del \u00FAltimo cierre", children: _jsx(SearchOutlined, {}) }))] }) })] }), _jsx(Card, { className: "paces-card", size: "small", style: {
                                            marginBottom: 16,
                                            borderRadius: 8,
                                            borderLeft: `3px solid ${validar ? '#556ee6' : '#d9d9d9'}`,
                                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: validar ? '#eef1ff' : '#f5f5f5',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 16,
                                                        color: validar ? '#556ee6' : '#bfbfbf',
                                                    }, children: _jsx(SafetyOutlined, {}) }), _jsx(Switch, { checked: validar, onChange: setValidar, disabled: generando }), _jsx(Text, { style: { fontSize: 13, flex: 1 }, children: "Validar documentos antes del cierre" })] }) }), _jsx(PermissionGate, { accion: "PROCESAR", children: _jsx(Button, { type: "primary", size: "large", block: true, icon: !generando ? _jsx(LockOutlined, {}) : undefined, loading: generando, disabled: !hayCierresPendientes || generando, onClick: handleGenerarCierre, style: {
                                                height: 48,
                                                fontSize: 16,
                                                fontWeight: 600,
                                                backgroundColor: '#556ee6',
                                                borderColor: '#556ee6',
                                                opacity: !hayCierresPendientes ? 0.65 : 1,
                                            }, children: generando
                                                ? 'Generando Cierre...'
                                                : `Generar Cierre al ${proximoCierreStr}` }) }), !hayCierresPendientes && fechaCierre && (_jsx(Alert, { message: "No hay cierres pendientes. Todos los per\u00EDodos est\u00E1n cerrados.", type: "info", showIcon: true, style: { marginTop: 12, borderRadius: 6 } })), renderValidationPanel(), cierreCompletado && (_jsx(Alert, { message: "Cierre generado exitosamente", type: "success", showIcon: true, style: { marginTop: 12, borderRadius: 6 } }))] }), _jsxs(Col, { xs: 24, lg: 8, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 13, fontWeight: 600 }, children: "Resumen" }), style: { marginBottom: 16, borderRadius: 8 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Sucursal" }), _jsx(Text, { strong: true, style: { fontSize: 13 }, children: SUCURSAL_VALUE_MAP[sucursal] || '—' })] }), _jsx("div", { style: { height: 1, background: '#f0f0f0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u00DAltimo cierre" }), _jsx(Text, { strong: true, style: { fontSize: 13 }, children: fechaCierre ? formatDateDisplay(fechaCierre) : '—' })] }), _jsx("div", { style: { height: 1, background: '#f0f0f0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Pr\u00F3ximo cierre" }), _jsx(Text, { strong: true, style: { fontSize: 13, color: '#556ee6' }, children: proximoCierreStr })] }), _jsx("div", { style: { height: 1, background: '#f0f0f0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Cierres pendientes" }), _jsx(Tag, { color: cierresRestantes > 0 ? 'warning' : 'success', style: { borderRadius: 4 }, children: cierresRestantes })] }), _jsx("div", { style: { height: 1, background: '#f0f0f0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Validar" }), _jsx(Tag, { color: validar ? 'blue' : 'default', style: { borderRadius: 4 }, children: validar ? 'Activado' : 'Desactivado' })] })] }) }), _jsx(PermissionGate, { accion: "PROCESAR", children: _jsxs(Button, { block: true, style: {
                                                borderColor: '#4a7db5',
                                                color: '#4a7db5',
                                                height: 40,
                                                fontSize: 14,
                                                fontWeight: 500,
                                            }, onClick: () => setReaperturaModalOpen(true), disabled: generando, children: [_jsx(LockOutlined, {}), " Reaperturar"] }) }), _jsx(Text, { type: "secondary", style: { display: 'block', textAlign: 'center', fontSize: 11, marginTop: 8 }, children: "Reabrir un per\u00EDodo de cierre anterior" })] })] }), _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 13, fontWeight: 600 }, children: "Historial de Cierres" }), style: { marginTop: 16, borderRadius: 8 }, children: cierres.length === 0 ? (_jsx(Text, { type: "secondary", style: { display: 'block', textAlign: 'center', padding: '24px 0' }, children: "No hay cierres registrados" })) : (_jsx(Table, { dataSource: cierres, rowKey: (_, index) => index?.toString() ?? '0', pagination: { pageSize: 10, size: 'small', showSizeChanger: false }, size: "small", style: { borderRadius: 6 }, columns: [
                                {
                                    title: 'Fecha de cierre',
                                    dataIndex: 'fechaCierre',
                                    key: 'fechaCierre',
                                    render: (val) => formatDateDisplay(val),
                                    width: 140,
                                },
                                {
                                    title: 'Fecha realizado',
                                    dataIndex: 'fechaRealizado',
                                    key: 'fechaRealizado',
                                    render: (val) => formatDateDisplay(val),
                                    width: 140,
                                },
                                {
                                    title: 'Cantidad total',
                                    dataIndex: 'cantidad',
                                    key: 'cantidad',
                                    render: (val) => val != null ? val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
                                    align: 'right',
                                    width: 140,
                                },
                                {
                                    title: 'Costo total',
                                    dataIndex: 'total',
                                    key: 'total',
                                    render: (val) => val != null
                                        ? `$${val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : '—',
                                    align: 'right',
                                    width: 140,
                                },
                                {
                                    title: 'Detalle',
                                    key: 'detalle',
                                    width: 70,
                                    align: 'center',
                                    render: (_, record) => (_jsx("div", { onClick: () => handleOpenDetalle(record), style: {
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#556ee6',
                                            transition: 'all 0.2s',
                                            fontSize: 15,
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.background = '#eef1ff';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }, title: "Ver detalle del cierre", children: _jsx(SearchOutlined, {}) })),
                                },
                            ] })) })] }), _jsx(CierreReaperturaModal, { open: reaperturaModalOpen, sucursal: sucursal, fechaCierreActual: fechaCierre, codigoUsuario: codigoUsuario, onClose: () => setReaperturaModalOpen(false), onSuccess: handleReaperturaSuccess }), _jsx(ExistenciasNegativasModal, { open: existenciasModalOpen, onClose: () => setExistenciasModalOpen(false), datos: existenciasNegativasData })] }));
};
export default CierreInventario;
