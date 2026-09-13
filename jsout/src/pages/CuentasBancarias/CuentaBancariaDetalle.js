import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Spin, Alert, Empty, Typography, Tag, Row, Col, Grid, message } from 'antd';
import { BankOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import DocumentListadoToolbar from '../../components/DocumentListadoToolbar';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatDateRaw } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import './CuentaBancariaDetalle.css';
const { Text } = Typography;
/* ===== Helpers ===== */
function formatCurrency(value, moneda) {
    if (value === null || value === undefined)
        return '-';
    const monedaDefault = getMonedaSucursalActiva();
    const symbol = moneda?.toUpperCase() === 'DOLAR' || moneda?.toUpperCase() === 'USD' ? 'US$' : (monedaDefault.simbolo || 'RD$');
    return `${symbol} ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function maskAccountNumber(noCuenta) {
    if (!noCuenta)
        return '';
    const clean = noCuenta.replace(/\s+/g, '');
    if (clean.length <= 4)
        return clean;
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
}
function getMonedaInfo(moneda) {
    if (moneda?.toUpperCase() === 'DOLAR')
        return { label: 'USD', color: '#10b981' };
    return { label: 'DOP', color: '#556ee6' };
}
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
}
function getBankColor(banco) {
    const colors = [
        'linear-gradient(135deg, #556ee6 0%, #6c7ff0 100%)',
        'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
        'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    ];
    const index = Math.abs(hashCode(banco || '')) % colors.length;
    return colors[index];
}
const ActiveCard = ({ cuenta }) => {
    const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
    const monedaInfo = getMonedaInfo(cuenta.moneda);
    const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
    const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;
    return (_jsxs("div", { className: `active-bank-card${!cuenta.activo ? ' card-inactive' : ''}${esUSD ? ' card-usd' : ''}`, style: { background: getBankColor(cuenta.banco) }, children: [_jsx("div", { className: "active-card-shine" }), _jsxs("div", { className: "active-card-content", children: [_jsxs("div", { className: "active-card-header", children: [_jsx("div", { className: "active-card-chip" }), _jsx("div", { className: "active-card-moneda-badge", style: { background: monedaInfo.color }, children: monedaInfo.label })] }), _jsx("div", { className: "active-card-number", children: maskAccountNumber(cuenta.noCuenta || '') }), _jsxs("div", { className: "active-card-bottom", children: [_jsxs("div", { className: "active-card-info", children: [_jsx("div", { className: "active-card-label", children: "Titular" }), _jsx("div", { className: "active-card-value", children: toTitleCase(cuenta.nombre || '') })] }), _jsxs("div", { className: "active-card-info", style: { textAlign: 'right' }, children: [_jsx("div", { className: "active-card-label", children: "Balance" }), _jsx("div", { className: `active-card-value${hasBalance ? ' active-card-balance' : ''}`, children: hasBalance ? balanceDisplay : '—' })] })] }), _jsxs("div", { className: "active-card-footer-row", children: [_jsx("span", { className: "active-card-banco", children: toTitleCase(cuenta.banco || '') }), _jsx(Tag, { color: cuenta.activo ? 'green' : 'red', className: "active-card-status-tag", children: cuenta.activo ? 'Activa' : 'Inactiva' })] })] })] }));
};
const SummarySidebar = ({ cuenta }) => {
    const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
    const monedaInfo = getMonedaInfo(cuenta.moneda);
    const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
    const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;
    return (_jsxs(Card, { className: "paces-card", styles: { body: { padding: '20px 24px' } }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }, children: "Balance actual" }), _jsx("div", { className: `summary-balance-hero${esUSD ? ' summary-balance-usd' : ''}`, children: hasBalance ? balanceDisplay : '—' })] }), _jsxs("div", { className: "summary-details-list", children: [_jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "Banco" }), _jsx("span", { className: "summary-detail-value", children: toTitleCase(cuenta.banco || '') })] }), _jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "No. Cuenta" }), _jsx("span", { className: "summary-detail-value", children: cuenta.noCuenta || '—' })] }), _jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "Cta. Contable" }), _jsx("span", { className: "summary-detail-value", children: cuenta.cuentaContable || '—' })] }), _jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "Moneda" }), _jsx(Tag, { color: esUSD ? 'green' : 'blue', style: { margin: 0 }, children: monedaInfo.label })] }), _jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "Tipo" }), _jsx("span", { className: "summary-detail-value", children: "\u2014" })] }), _jsxs("div", { className: "summary-detail-row", children: [_jsx("span", { className: "summary-detail-label", children: "Estado" }), _jsx(Tag, { color: cuenta.activo ? 'success' : 'error', style: { margin: 0 }, children: cuenta.activo ? 'Activo' : 'Inactivo' })] })] })] }));
};
const CompactSummary = ({ cuenta }) => {
    const esUSD = cuenta.moneda?.toUpperCase() === 'DOLAR' || cuenta.moneda?.toUpperCase() === 'USD';
    const monedaInfo = getMonedaInfo(cuenta.moneda);
    const balanceDisplay = formatCurrency(cuenta.balance, cuenta.moneda);
    const hasBalance = cuenta.balance !== undefined && cuenta.balance !== null;
    return (_jsx("div", { style: { padding: '0 24px 12px' }, children: _jsx(Card, { className: "paces-card", size: "small", styles: { body: { padding: '12px 16px' } }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block' }, children: "Balance actual" }), _jsx(Text, { strong: true, style: { fontSize: 20, color: esUSD ? '#10b981' : undefined }, children: hasBalance ? balanceDisplay : '—' })] }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("span", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block' }, children: "No. Cuenta" }), _jsx(Text, { children: maskAccountNumber(cuenta.noCuenta || '') })] }), _jsxs("span", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block' }, children: "Cta. Contable" }), _jsx(Text, { children: cuenta.cuentaContable || '—' })] }), _jsx(Tag, { color: monedaInfo.color, children: monedaInfo.label }), _jsxs("span", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, display: 'block' }, children: "Tipo" }), _jsx(Text, { children: "\u2014" })] }), _jsx(Tag, { color: cuenta.activo ? 'success' : 'error', children: cuenta.activo ? 'Activo' : 'Inactivo' })] })] }) }) }));
};
/* ===== Main Component ===== */
const FTransBanco = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const screens = Grid.useBreakpoint();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const isLarge = screens.xxl === true;
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [filtros, setFiltros] = useState({});
    const [movimientos, setMovimientos] = useState([]);
    const [loadingMov, setLoadingMov] = useState(false);
    const [totalMov, setTotalMov] = useState(0);
    const cuentaActiva = useMemo(() => cuentas[activeIndex] || null, [activeIndex, cuentas]);
    /* ---- Data loading ---- */
    const cargarDatos = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
            setCuentas(result || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva]);
    /* ---- Lifecycle ---- */
    useEffect(() => {
        setActiveModule('FTransBanco');
        cargarDatos();
        return () => resetToolbar();
    }, [setActiveModule, resetToolbar, cargarDatos]);
    /* ---- Pre-selection from MCuentaBanco ---- */
    useEffect(() => {
        if (cuentas.length > 0) {
            const preSelected = location.state?.cuentaCodigo;
            if (preSelected) {
                const idx = cuentas.findIndex((c) => c.codigo === preSelected);
                if (idx >= 0) {
                    setActiveIndex(idx);
                    return;
                }
            }
            if (activeIndex >= cuentas.length) {
                setActiveIndex(0);
            }
        }
    }, [cuentas, location.state]);
    /* ---- Navigation handlers ---- */
    const handlePrev = () => {
        setActiveIndex((prev) => Math.max(0, prev - 1));
    };
    const handleNext = () => {
        setActiveIndex((prev) => Math.min(cuentas.length - 1, prev + 1));
    };
    const handleRefresh = () => {
        setSearchText('');
        setCurrentPage(1);
        cargarDatos();
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setCurrentPage(1);
    };
    const handlePageSizeChange = (value) => {
        setPageSize(value);
        setCurrentPage(1);
    };
    const handleFiltrosAplicar = (f) => {
        setFiltros(f);
        setCurrentPage(1);
    };
    const cargarMovimientos = useCallback(async (pagina, filas) => {
        if (!cuentaActiva?.noCuenta)
            return;
        setLoadingMov(true);
        try {
            const desde = filtros.desde ?? '19000101000000';
            const hasta = filtros.hasta ?? '20991231235959';
            const result = await cuentaBancariaApi.obtenerMovimientos(sucursalActiva, cuentaActiva.noCuenta, {
                desde, hasta, cantidad: filas, salto: (pagina - 1) * filas,
                busqueda: searchText || undefined,
                estado: filtros.estado,
            });
            setMovimientos(result || []);
            setTotalMov(result.length < filas ? (pagina - 1) * filas + result.length : pagina * filas + 1);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar movimientos');
        }
        finally {
            setLoadingMov(false);
        }
    }, [sucursalActiva, cuentaActiva?.codigo, filtros, searchText]);
    /* ---- Load movimientos on dependency change ---- */
    useEffect(() => {
        cargarMovimientos(currentPage, pageSize);
    }, [currentPage, pageSize, cuentaActiva, filtros, searchText, cargarMovimientos]);
    /* ---- Client-side search filter ---- */
    const movimientosFiltrados = useMemo(() => {
        if (!searchText || !movimientos.length)
            return movimientos;
        const lower = searchText.toLowerCase();
        return movimientos.filter((m) => (m.documento || '').toLowerCase().includes(lower) ||
            (m.concepto || '').toLowerCase().includes(lower) ||
            (m.entidad || '').toLowerCase().includes(lower));
    }, [movimientos, searchText]);
    /* ---- Table columns ---- */
    const monedaActual = cuentaActiva?.moneda;
    const columns = [
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 160, fixed: 'left',
            render: (doc) => _jsx(Text, { strong: true, children: doc }) },
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 130,
            render: (val) => formatDateRaw(val) },
        { title: 'Entidad / Beneficiario', dataIndex: 'entidad', key: 'entidad',
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }) },
        { title: 'Concepto', dataIndex: 'concepto', key: 'concepto', width: 280, ellipsis: true,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }) },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 160, align: 'right',
            render: (val) => _jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val, monedaActual) }) },
        { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 130,
            render: (est) => _jsx(EstadoColumnCell, { estado: est }) },
    ];
    /* ---- Derived state ---- */
    const isEmpty = !loading && !loadingError && cuentas.length === 0;
    const hasError = loadingError;
    const hasContent = !loading && !loadingError && cuentas.length > 0;
    /* ===== Render ===== */
    return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [loading && !loadingError && (_jsxs("div", { style: { textAlign: 'center', padding: '60px 0' }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando cuentas bancarias..." })] })), hasError && (_jsx("div", { style: { padding: '16px 24px 24px' }, children: _jsx(Alert, { message: "Error al cargar cuentas bancarias", type: "error", showIcon: true, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) }) })), isEmpty && (_jsx("div", { style: { padding: '48px 24px', textAlign: 'center' }, children: _jsx(Empty, { image: _jsx(BankOutlined, { style: { fontSize: 48, color: '#d9d9d9' } }), description: "No hay cuentas bancarias registradas" }) })), hasContent && cuentaActiva && (_jsxs(_Fragment, { children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: isLarge ? (_jsxs(Row, { gutter: 16, style: { marginBottom: 16 }, children: [_jsx(Col, { xxl: 18, children: _jsxs("div", { className: "cuenta-card-stack", children: [_jsx(Button, { className: "stack-arrow-btn", shape: "circle", icon: _jsx(LeftOutlined, {}), onClick: handlePrev, disabled: activeIndex === 0, size: "large" }), _jsxs("div", { className: "stack-cards-wrapper", children: [_jsx("div", { className: "stack-card-main", children: _jsx(ActiveCard, { cuenta: cuentaActiva }) }), _jsxs("div", { className: "stack-card-count", children: [activeIndex + 1, " / ", cuentas.length] })] }), _jsx(Button, { className: "stack-arrow-btn", shape: "circle", icon: _jsx(RightOutlined, {}), onClick: handleNext, disabled: activeIndex === cuentas.length - 1, size: "large" })] }) }), _jsx(Col, { xxl: 6, children: _jsx("div", { className: "cuenta-summary-sidebar", children: _jsx(SummarySidebar, { cuenta: cuentaActiva }) }) })] })) : (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { className: "cuenta-card-stack", children: [_jsx(Button, { className: "stack-arrow-btn", shape: "circle", icon: _jsx(LeftOutlined, {}), onClick: handlePrev, disabled: activeIndex === 0, size: "large" }), _jsxs("div", { className: "stack-cards-wrapper", children: [_jsx("div", { className: "stack-card-main", children: _jsx(ActiveCard, { cuenta: cuentaActiva }) }), _jsxs("div", { className: "stack-card-count", children: [activeIndex + 1, " / ", cuentas.length] })] }), _jsx(Button, { className: "stack-arrow-btn", shape: "circle", icon: _jsx(RightOutlined, {}), onClick: handleNext, disabled: activeIndex === cuentas.length - 1, size: "large" })] }), _jsx(CompactSummary, { cuenta: cuentaActiva })] })) }), _jsxs("div", { style: { padding: '0 24px 16px' }, children: [_jsx(DocumentListadoToolbar, { showFiltros: true, filtros: filtros, opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO, rangoDefault: { desde: '', hasta: '' }, onFiltrosAplicar: handleFiltrosAplicar, searchPlaceholder: "Buscar documento, concepto...", onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: handlePageSizeChange, showCrear: true, onCrear: () => navigate('/FTransBanco/nuevo'), onRefresh: handleRefresh }), _jsx("div", { style: { marginBottom: 8 }, children: _jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }, children: "Movimientos" }) }), _jsx(Table, { dataSource: movimientosFiltrados, columns: columns, rowKey: "id", size: "small", loading: loadingMov, className: "paces-border-top paces-list-table", scroll: { x: 1100 }, pagination: {
                                    current: currentPage,
                                    pageSize,
                                    total: searchText ? movimientosFiltrados.length : totalMov,
                                    showTotal: (t) => `${t} registros`,
                                    showSizeChanger: false,
                                    onChange: (page) => setCurrentPage(page),
                                }, rowClassName: "paces-row-hover", onRow: (record) => ({
                                    onClick: () => {
                                        if (record.id) {
                                            navigate(`/FTransBanco/${record.id}`, { state: { cuentaCodigo: cuentaActiva?.codigo } });
                                        }
                                    },
                                    style: { cursor: record.id ? 'pointer' : 'default' },
                                }), locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay movimientos para esta cuenta" }) }) } })] })] }))] }));
};
export default FTransBanco;
