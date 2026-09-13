import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Button, Space, Tag, message, Spin, Empty, Table, theme, Tooltip, Segmented, Modal, Checkbox, Input, Select, Skeleton, } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, FileTextOutlined, OrderedListOutlined, TeamOutlined, InboxOutlined, RiseOutlined, SyncOutlined, ReloadOutlined, SettingOutlined, SearchOutlined, BarChartOutlined, LineChartOutlined, WarningOutlined, UserOutlined, RocketOutlined, CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { dashboardApi } from '../../api/dashboardApi';
import EntidadImagen from '../../components/EntidadImagen';
import { formatDateParam, formatCurrency, formatNumber, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
const { Text } = Typography;
const STORAGE_KEY = 'solugen-quick-access';
function obtenerPreferidas(usuarioID) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}-${usuarioID}`);
        if (raw)
            return JSON.parse(raw);
    }
    catch { /* ignore */ }
    return [];
}
function guardarPreferidas(usuarioID, codigos) {
    localStorage.setItem(`${STORAGE_KEY}-${usuarioID}`, JSON.stringify(codigos));
}
function formatKPIValue(value, kind) {
    if (kind === 'currency') {
        if (value >= 1_000_000)
            return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000)
            return `${(value / 1_000).toFixed(1)}K`;
        try {
            return formatNumber(value);
        }
        catch {
            return value.toLocaleString('es-DO');
        }
    }
    if (value >= 1_000)
        return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('es-DO');
}
const Dashboard = () => {
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const companyData = useCompanyStore((s) => s.data);
    const { token: themeToken } = theme.useToken();
    // ── Estados ──────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [resumen, setResumen] = useState(null);
    const [recientes, setRecientes] = useState([]);
    const [ventasPorMes, setVentasPorMes] = useState([]);
    const [docsPorTipo, setDocsPorTipo] = useState([]);
    const [comparativo, setComparativo] = useState([]);
    const [evolucionDiaria, setEvolucionDiaria] = useState([]);
    const [pendientesNCF, setPendientesNCF] = useState([]);
    const [docsNoCuadrados, setDocsNoCuadrados] = useState([]);
    const [periodo, setPeriodo] = useState('mes');
    // Estados accesos rápidos
    const [configOpen, setConfigOpen] = useState(false);
    const [selected, setSelected] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    // Estados stock negativo
    const [sucursalesActivas, setSucursalesActivas] = useState([]);
    const [sucursalStock, setSucursalStock] = useState('');
    const [stockNegativo, setStockNegativo] = useState([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [totalStock, setTotalStock] = useState(0);
    const [paginaStock, setPaginaStock] = useState(1);
    const pageSizeStock = 10;
    const preferidas = obtenerPreferidas(usuario?.id ?? 0);
    const todasPantallas = usuario?.pantallas || [];
    const pantallasVisibles = preferidas.length > 0
        ? todasPantallas.filter((p) => preferidas.includes(p.codigo))
        : todasPantallas.slice(0, 6);
    const todayStr = useMemo(() => {
        return new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
    }, []);
    const nombreCortoUsuario = useMemo(() => {
        return usuario?.nombre?.trim().split(/\s+/)[0] || 'Usuario';
    }, [usuario?.nombre]);
    const nombreSucursalActiva = useMemo(() => {
        const sucursalEmpresa = companyData?.sucursales?.find((s) => String(s?.codigo ?? s?.id ?? '') === String(sucursalActiva ?? ''));
        return sucursalEmpresa?.nombre || `Sucursal ${sucursalActiva ?? '-'}`;
    }, [companyData?.sucursales, sucursalActiva]);
    const totalPendientesOperativos = useMemo(() => {
        return ((resumen?.documentosPendientes ?? 0)
            + pendientesNCF.length
            + docsNoCuadrados.length
            + totalStock);
    }, [docsNoCuadrados.length, pendientesNCF.length, resumen?.documentosPendientes, totalStock]);
    const etiquetaPeriodo = useMemo(() => {
        switch (periodo) {
            case 'dia':
                return 'Hoy';
            case 'semana':
                return 'Ultimos 7 dias';
            case 'ano':
                return 'Ultimos 12 meses';
            default:
                return 'Ultimos 30 dias';
        }
    }, [periodo]);
    // ── Carga de datos ──────────────────────────────────────
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        const now = new Date();
        let desde;
        let meses;
        switch (periodo) {
            case 'dia':
                desde = formatDateParam(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
                meses = 1;
                break;
            case 'semana':
                desde = formatDateParam(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
                meses = 3;
                break;
            case 'ano':
                desde = formatDateParam(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
                meses = 12;
                break;
            case 'mes':
            default:
                desde = formatDateParam(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
                meses = 6;
                break;
        }
        const hasta = formatDateParam(now);
        try {
            const [res, rec, ventas, docs, comp, evolucion] = await Promise.all([
                dashboardApi.obtenerResumen(sucursalActiva, desde, hasta),
                dashboardApi.obtenerRecientes(sucursalActiva, 10),
                dashboardApi.obtenerVentasPorMes(sucursalActiva, meses),
                dashboardApi.obtenerDocsPorTipo(sucursalActiva, desde, hasta),
                dashboardApi.obtenerComparativoSucursales(desde, hasta),
                dashboardApi.obtenerEvolucionDiaria(sucursalActiva, desde, hasta),
            ]);
            setResumen(res);
            setRecientes(rec);
            setVentasPorMes(ventas);
            setDocsPorTipo(docs);
            setComparativo(comp);
            setEvolucionDiaria(evolucion);
            // Cargar pendientes NCF
            try {
                const ncf = await dashboardApi.obtenerPendientesNCF(desde, hasta);
                setPendientesNCF(ncf);
            }
            catch {
                // Silencioso: carga periférica
            }
            // Cargar docs no cuadrados
            try {
                const nc = await dashboardApi.obtenerDocsNoCuadrados(sucursalActiva, desde, hasta);
                setDocsNoCuadrados(nc);
            }
            catch {
                // Silencioso: carga periférica
            }
            // Cargar sucursales activas por separado (no bloquea el dashboard si falla)
            let sucActivas = [];
            try {
                sucActivas = await dashboardApi.obtenerSucursalesActivas();
            }
            catch {
                // Silencioso: carga periférica
            }
            setSucursalesActivas(sucActivas);
            if (sucActivas.length > 0) {
                setSucursalStock((prev) => prev || sucActivas[0].codigo);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar dashboard');
            message.error(msg);
        }
        finally {
            setLoading(false);
            setLastUpdated(new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }));
        }
    }, [sucursalActiva, periodo]);
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);
    useEffect(() => {
        if (configOpen) {
            setSelected(preferidas.length > 0
                ? preferidas
                : todasPantallas.slice(0, 6).map((p) => p.codigo));
        }
    }, [configOpen, usuario?.id]);
    // ── Cargar stock negativo cuando cambia sucursal o página ─
    useEffect(() => {
        if (!sucursalStock)
            return;
        setLoadingStock(true);
        const salto = (paginaStock - 1) * pageSizeStock;
        dashboardApi.obtenerProductosStockNegativo(Number(sucursalStock), pageSizeStock, salto)
            .then((res) => {
            setStockNegativo(res.items);
            setTotalStock(res.total);
        })
            .catch(() => message.error('Error al cargar stock negativo'))
            .finally(() => setLoadingStock(false));
    }, [sucursalStock, paginaStock]);
    // ── Handlers ────────────────────────────────────────────
    const navegarKPI = useCallback((path) => {
        navigate(path);
    }, [navigate]);
    const navegarDoc = useCallback((tipoDoc, noDoc) => {
        if (noDoc) {
            navigate(`/${tipoDoc}/${noDoc}`);
        }
        else {
            navigate(`/${tipoDoc}`);
        }
    }, [navigate]);
    const handleGuardarConfig = useCallback(() => {
        if (!usuario)
            return;
        guardarPreferidas(usuario.id, selected);
        setConfigOpen(false);
        message.success('Accesos rápidos actualizados');
    }, [usuario, selected]);
    // ── Permisos para filtrar KPIs ──────────────────────────
    const codigosPermitidos = useMemo(() => {
        if (!usuario?.pantallas)
            return new Set();
        return new Set(usuario.pantallas.map(p => p.codigo));
    }, [usuario]);
    // ── KPIs ────────────────────────────────────────────────
    const kpiItems = useMemo(() => [
        {
            key: 'ventas',
            codigoPantalla: 'FFAC',
            icon: _jsx(DollarOutlined, {}),
            color: '#34c38f',
            bg: 'rgba(52,195,143,0.1)',
            valor: resumen?.ventasDelMes ?? 0,
            label: 'Ventas del Mes',
            kind: 'currency',
            path: '/FFAC',
            change: `+${resumen?.cantidadVentas ?? 0} docs`,
            changeUp: true,
            variacion: resumen?.variacionVentas,
            valorAnterior: resumen?.ventasPeriodoAnterior,
        },
        {
            key: 'compras',
            codigoPantalla: 'FRDE',
            icon: _jsx(ShoppingCartOutlined, {}),
            color: '#556ee6',
            bg: 'rgba(85,110,230,0.1)',
            valor: resumen?.comprasDelMes ?? 0,
            label: 'Compras del Mes',
            kind: 'currency',
            path: '/FRDE',
            change: `+${resumen?.cantidadCompras ?? 0} docs`,
            changeUp: true,
            variacion: resumen?.variacionCompras,
            valorAnterior: resumen?.comprasPeriodoAnterior,
        },
        {
            key: 'pendientes',
            codigoPantalla: 'ORepostear',
            icon: _jsx(FileTextOutlined, {}),
            color: '#f46a6a',
            bg: 'rgba(244,106,106,0.1)',
            valor: resumen?.documentosPendientes ?? 0,
            label: 'Docs Pendientes',
            kind: 'number',
            path: '/ORepostear',
            change: 'Requieren acción',
            changeUp: false,
        },
        {
            key: 'oc',
            codigoPantalla: 'FORC',
            icon: _jsx(OrderedListOutlined, {}),
            color: '#f0b345',
            bg: 'rgba(240,179,69,0.1)',
            valor: resumen?.ordenesCompraActivas ?? 0,
            label: 'O.C. Activas',
            kind: 'number',
            path: '/FORC',
            change: 'Pendientes recibir',
            changeUp: true,
        },
        {
            key: 'clientes',
            codigoPantalla: 'MCliente',
            icon: _jsx(TeamOutlined, {}),
            color: '#6c5ffc',
            bg: 'rgba(108,95,252,0.1)',
            valor: resumen?.clientesActivos ?? 0,
            label: 'Clientes Activos',
            kind: 'number',
            path: '/MCliente',
            change: `${companyData?.sucursales?.length ?? 0} sucursales`,
            changeUp: true,
        },
        {
            key: 'productos',
            codigoPantalla: 'MProducto',
            icon: _jsx(InboxOutlined, {}),
            color: '#13c2c2',
            bg: 'rgba(19,194,194,0.1)',
            valor: resumen?.productosInventario ?? 0,
            label: 'Productos',
            kind: 'number',
            path: '/MProducto',
            change: 'En inventario',
            changeUp: true,
        },
    ], [resumen, companyData]);
    const kpiVisibles = useMemo(() => codigosPermitidos.size === 0
        ? kpiItems // fallback: si no hay permisos configurados, mostrar todos
        : kpiItems.filter(item => codigosPermitidos.has(item.codigoPantalla)), [kpiItems, codigosPermitidos]);
    // ── Columnas tabla recientes ────────────────────────────
    const columnasRecientes = useMemo(() => [
        {
            title: 'Documento',
            dataIndex: 'noDocumento',
            key: 'noDocumento',
            width: 160,
            render: (_, record) => (_jsxs("span", { className: "paces-doc-link", onClick: () => navegarDoc(record.tipoDocumento, record.noDocumento), style: { fontSize: 13 }, children: [record.tipoDocumento, "-", record.noDocumento] })),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidadNombre',
            key: 'entidadNombre',
            ellipsis: true,
            render: (val) => (_jsx(Text, { style: { fontSize: 13 }, children: val || '-' })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right',
            render: (val) => (_jsx(Text, { strong: true, style: { fontSize: 13 }, children: formatCurrency(val) })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 120,
            render: (estado) => {
                const info = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 120,
            render: (val) => (_jsx(Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: val ? new Date(val).toLocaleDateString('es-DO') : '-' })),
        },
    ], [navegarDoc]);
    // ── Early return vacío si no hay usuario ────────────────
    if (!usuario) {
        return _jsx(Empty, { description: "No se pudo cargar la informaci\u00F3n del usuario" });
    }
    // ── Render ──────────────────────────────────────────────
    return (_jsxs("div", { style: { animation: 'fadeIn 0.3s ease' }, children: [_jsxs("div", { className: "dashboard-hero", children: [_jsxs("div", { className: "dashboard-hero-copy", children: [_jsxs("h1", { className: "dashboard-hero-title", children: ["Hola, ", nombreCortoUsuario] }), _jsxs("div", { className: "dashboard-hero-meta", children: [_jsx("span", { children: todayStr }), _jsxs("span", { children: [companyData?.sucursales?.length ?? 0, " sucursales visibles"] }), _jsxs("span", { children: [totalPendientesOperativos, " alertas operativas"] })] })] }), _jsxs("div", { className: "dashboard-hero-actions", children: [_jsxs("div", { className: "dashboard-hero-actions-top", children: [_jsx(Tag, { icon: _jsx(SyncOutlined, { spin: loading }), color: loading ? 'processing' : 'default', children: loading ? 'Actualizando datos' : 'Datos al dia' }), _jsx(Tooltip, { title: "Recargar datos", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarDatos, loading: loading, children: "Actualizar" }) }), lastUpdated && (_jsxs("span", { className: "dashboard-last-updated", children: ["\u00DAlt. act.: ", lastUpdated] }))] }), _jsx(Segmented, { value: periodo, onChange: (val) => setPeriodo(val), options: [
                                    { value: 'dia', label: 'Hoy' },
                                    { value: 'semana', label: 'Semana' },
                                    { value: 'mes', label: 'Mes' },
                                    { value: 'ano', label: 'Año' },
                                ] })] })] }), loading && !resumen ? (_jsxs("div", { style: { padding: '0 0 24px' }, children: [_jsx(Row, { gutter: [16, 16], children: Array.from({ length: 6 }).map((_, i) => (_jsx(Col, { xs: 12, sm: 8, lg: 6, xl: 4, children: _jsx("div", { className: "dashboard-kpi-card", children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 }, title: { width: '60%' } }) }) }, i))) }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: Array.from({ length: 3 }).map((_, i) => (_jsx(Col, { xs: 24, lg: 8, children: _jsx("div", { className: "dashboard-chart-card", children: _jsx(Skeleton, { active: true, paragraph: { rows: 6 }, title: { width: '40%' } }) }) }, i))) })] })) : (_jsxs(_Fragment, { children: [_jsx(Row, { gutter: [16, 16], children: kpiVisibles.map((kpi) => (_jsx(Col, { xs: 12, sm: 8, lg: 6, xl: 4, children: _jsxs("div", { className: "dashboard-kpi-card", style: { '--kpi-accent': kpi.color }, onClick: () => navegarKPI(kpi.path), children: [_jsxs("div", { className: "dashboard-kpi-top", children: [_jsx("div", { className: "dashboard-kpi-icon", style: { background: kpi.bg, color: kpi.color }, children: kpi.icon }), _jsx("span", { className: "dashboard-kpi-chip", children: kpi.kind === 'currency' ? 'Monto' : 'Conteo' })] }), _jsx("div", { className: "dashboard-kpi-value", children: formatKPIValue(kpi.valor, kpi.kind) }), _jsx("p", { className: "dashboard-kpi-label", children: kpi.label }), _jsxs("div", { className: "dashboard-kpi-footer", children: [_jsxs("div", { className: "dashboard-kpi-change", style: { color: kpi.changeUp ? '#34c38f' : '#f46a6a' }, children: [kpi.changeUp ? (_jsx(RiseOutlined, { style: { fontSize: 11 } })) : (_jsx(WarningOutlined, { style: { fontSize: 11 } })), kpi.change] }), 'variacion' in kpi && kpi.variacion !== undefined && (_jsxs("div", { className: "dashboard-kpi-variation", style: { color: kpi.variacion >= 0 ? '#34c38f' : '#f46a6a' }, children: [kpi.variacion >= 0 ? _jsx(ArrowUpOutlined, { style: { fontSize: 10 } }) : _jsx(ArrowDownOutlined, { style: { fontSize: 10 } }), Math.abs(kpi.variacion).toFixed(1), "% vs per\u00EDodo anterior"] }))] })] }) }, kpi.key))) }), _jsxs(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: [_jsx(Col, { xs: 24, lg: 8, children: _jsxs("div", { className: "dashboard-chart-card", children: [_jsxs("h3", { className: "dashboard-section-title", children: [_jsx(BarChartOutlined, {}), " Ventas vs Compras por Mes"] }), ventasPorMes.length > 0 ? (_jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(BarChart, { data: ventasPorMes, margin: { top: 20, right: 20, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--paces-border)" }), _jsx(XAxis, { dataKey: "etiqueta", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 11 } }), _jsx(RechartsTooltip, { formatter: (value) => [formatCurrency(value), undefined] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "totalVentas", name: "Ventas", fill: "#34c38f", radius: [4, 4, 0, 0] }), _jsx(Bar, { dataKey: "totalCompras", name: "Compras", fill: "#f46a6a", radius: [4, 4, 0, 0] })] }) })) : (_jsx("div", { className: "dashboard-panel-empty", children: _jsx(Empty, { description: "Sin datos de ventas" }) }))] }) }), _jsx(Col, { xs: 24, lg: 8, children: _jsxs("div", { className: "dashboard-chart-card dashboard-chart-card-compact", children: [_jsx("div", { className: "dashboard-panel-header-minimal", style: { padding: '16px 20px 8px' }, children: _jsxs("h3", { className: "dashboard-section-title-tight", children: [_jsx(BarChartOutlined, {}), " Comparativo por Sucursales"] }) }), comparativo.length > 0 ? (_jsx(Table, { dataSource: comparativo, rowKey: (r) => r.sucursal || `comp-${Math.random()}`, pagination: false, size: "small", className: "paces-list-table paces-border-top", showHeader: false, columns: [
                                                {
                                                    title: 'Sucursal',
                                                    dataIndex: 'sucursal',
                                                    key: 'sucursal',
                                                    render: (v) => _jsx(Text, { strong: true, style: { fontSize: 13 }, children: v }),
                                                },
                                                {
                                                    title: 'Ventas',
                                                    dataIndex: 'ventas',
                                                    key: 'ventas',
                                                    align: 'right',
                                                    render: (v) => _jsx(Text, { style: { color: '#34c38f', fontSize: 13, fontWeight: 600 }, children: formatCurrency(v) }),
                                                },
                                                {
                                                    title: 'Compras',
                                                    dataIndex: 'compras',
                                                    key: 'compras',
                                                    align: 'right',
                                                    render: (v) => _jsx(Text, { style: { color: '#556ee6', fontSize: 13, fontWeight: 600 }, children: formatCurrency(v) }),
                                                },
                                            ] })) : (_jsx("div", { className: "dashboard-panel-empty", children: _jsx("span", { className: "paces-text-secondary", children: "Sin datos del per\u00EDodo" }) }))] }) }), _jsx(Col, { xs: 24, lg: 8, children: _jsxs("div", { className: "dashboard-chart-card", children: [_jsxs("h3", { className: "dashboard-section-title", children: [_jsx(LineChartOutlined, {}), " Evoluci\u00F3n Diaria"] }), evolucionDiaria.length > 0 ? (_jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(LineChart, { data: evolucionDiaria, margin: { top: 20, right: 20, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--paces-border)" }), _jsx(XAxis, { dataKey: "fecha", tick: { fontSize: 10 }, tickFormatter: (val) => {
                                                            const d = new Date(val);
                                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                                        } }), _jsx(YAxis, { tick: { fontSize: 11 } }), _jsx(RechartsTooltip, { labelFormatter: (val) => new Date(val).toLocaleDateString('es-DO'), formatter: (value) => [formatCurrency(value), undefined] }), _jsx(Line, { type: "monotone", dataKey: "ventas", name: "Ventas", stroke: "#34c38f", strokeWidth: 2, dot: { r: 3 } })] }) })) : (_jsx("div", { className: "dashboard-panel-empty", children: _jsx("span", { className: "paces-text-secondary", children: "Sin datos del per\u00EDodo" }) }))] }) })] }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: _jsx(Col, { xs: 24, children: _jsxs("div", { className: "dashboard-chart-card dashboard-chart-card-compact", children: [_jsxs("div", { className: "dashboard-panel-header", children: [_jsxs("h3", { className: "dashboard-section-title-tight", children: [_jsx(FileTextOutlined, {}), " NCF Pendientes por Enviar"] }), _jsx("span", { className: "dashboard-panel-status", style: { color: pendientesNCF.length > 0 ? '#f46a6a' : '#34c38f' }, children: pendientesNCF.length > 0 ? `${pendientesNCF.length} pendiente(s)` : _jsxs(_Fragment, { children: [_jsx(CheckCircleOutlined, {}), " Al d\u00EDa"] }) })] }), pendientesNCF.length > 0 ? (_jsx(Table, { dataSource: pendientesNCF, rowKey: (r) => r.id ?? `ncf-${r.transaccionID ?? Math.random()}`, pagination: false, size: "small", className: "paces-list-table paces-border-top", columns: [
                                            { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v?.split('T')[0] }) },
                                            { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 150, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v || '-' }) },
                                            { title: 'Cliente', dataIndex: 'cliente', key: 'cliente', ellipsis: true, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v ? v.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : '-' }) },
                                            { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 140, render: (v) => _jsx(Text, { code: true, style: { fontSize: 11 }, children: v || '-' }) },
                                            { title: 'Mensaje DGII', dataIndex: 'respuestaDGII', key: 'respuestaDGII', ellipsis: true, render: (v) => v ? _jsx(Text, { style: { color: '#f46a6a', fontSize: 12 }, children: v }) : _jsx(Text, { className: "paces-text-placeholder", style: { fontSize: 12 }, children: "-" }) },
                                            { title: 'Sucursal', dataIndex: 'sucursalNombre', key: 'sucursalNombre', width: 120, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v || '-' }) },
                                        ] })) : (_jsx("div", { className: "dashboard-empty-state", children: _jsxs("span", { className: "paces-text-secondary", children: [_jsx(CheckCircleOutlined, {}), " No hay NCF pendientes por enviar en este per\u00EDodo"] }) }))] }) }) }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: _jsx(Col, { xs: 24, children: _jsxs("div", { className: "dashboard-chart-card dashboard-chart-card-compact", children: [_jsxs("div", { className: "dashboard-panel-header", children: [_jsxs("h3", { className: "dashboard-section-title-tight", children: [_jsx(WarningOutlined, {}), " Documentos No Cuadrados"] }), _jsx("span", { className: "dashboard-panel-status", style: { color: docsNoCuadrados.length > 0 ? '#f46a6a' : '#34c38f' }, children: docsNoCuadrados.length > 0 ? `${docsNoCuadrados.length} documento(s)` : _jsxs(_Fragment, { children: [_jsx(CheckCircleOutlined, {}), " Al d\u00EDa"] }) })] }), docsNoCuadrados.length > 0 ? (_jsx(Table, { dataSource: docsNoCuadrados, rowKey: (r) => r.id ?? `doc-${Math.random()}`, pagination: { pageSize: 5, showSizeChanger: false }, size: "small", className: "paces-list-table paces-border-top", columns: [
                                            { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 110, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v?.split('T')[0] }) },
                                            { title: 'Documento', dataIndex: 'noDocumento', key: 'noDocumento', width: 150, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v || '-' }) },
                                            { title: 'Entidad', dataIndex: 'nombreEntidad', key: 'nombreEntidad', ellipsis: true, render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: v || '-' }) },
                                            { title: 'Débitos', dataIndex: 'debitos', key: 'debitos', width: 130, align: 'right', render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: formatNumber(v) }) },
                                            { title: 'Créditos', dataIndex: 'creditos', key: 'creditos', width: 130, align: 'right', render: (v) => _jsx(Text, { style: { fontSize: 12 }, children: formatNumber(v) }) },
                                            { title: 'Diferencia', key: 'diferencia', width: 130, align: 'right', render: (_, r) => {
                                                    const diff = (r.debitos || 0) - (r.creditos || 0);
                                                    return _jsx(Text, { style: { color: '#f46a6a', fontWeight: 600, fontSize: 12 }, children: formatNumber(diff) });
                                                } },
                                        ] })) : (_jsx("div", { className: "dashboard-empty-state", children: _jsxs("span", { className: "paces-text-secondary", children: [_jsx(CheckCircleOutlined, {}), " No hay documentos no cuadrados en este per\u00EDodo"] }) }))] }) }) }), _jsx(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: _jsx(Col, { xs: 24, children: _jsxs("div", { className: "dashboard-chart-card dashboard-chart-card-compact", children: [_jsx("div", { className: "dashboard-panel-header", children: _jsxs("h3", { className: "dashboard-section-title-tight", children: [_jsx(FileTextOutlined, {}), " \u00DAltimos Documentos"] }) }), recientes.length > 0 ? (_jsx(Table, { dataSource: recientes, columns: columnasRecientes, rowKey: (r) => `${r.tipoDocumento}-${r.noDocumento}`, pagination: false, size: "middle", className: "paces-list-table paces-border-top" })) : (_jsx("div", { className: "dashboard-panel-empty", children: _jsx(Empty, { description: "Sin documentos recientes" }) }))] }) }) }), sucursalesActivas.length > 0 && (_jsx(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: _jsx(Col, { xs: 24, children: _jsxs("div", { className: "dashboard-chart-card dashboard-chart-card-compact", children: [_jsxs("div", { className: "dashboard-panel-header", children: [_jsxs("h3", { className: "dashboard-section-title-tight", children: [_jsx(InboxOutlined, {}), " Productos con Stock Negativo"] }), _jsx(Select, { value: sucursalStock, onChange: (val) => {
                                                    setSucursalStock(val);
                                                    setPaginaStock(1);
                                                }, style: { width: 220 }, options: sucursalesActivas.map(s => ({
                                                    value: s.codigo,
                                                    label: s.nombre,
                                                })), loading: loadingStock })] }), stockNegativo.length > 0 || loadingStock ? (_jsx(Table, { dataSource: stockNegativo, rowKey: (r) => `${r.codigo}-${r.almacen}`, pagination: {
                                            current: paginaStock,
                                            pageSize: pageSizeStock,
                                            total: totalStock,
                                            onChange: (page) => setPaginaStock(page),
                                            showSizeChanger: false,
                                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                                        }, size: "small", className: "paces-list-table paces-border-top", loading: loadingStock, columns: [
                                            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120, render: (v) => _jsx(Text, { code: true, style: { fontSize: 12 }, children: v }) },
                                            { title: 'Producto', dataIndex: 'nombre', key: 'nombre', ellipsis: true, render: (v) => _jsx(Text, { style: { fontSize: 13 }, children: v || '-' }) },
                                            { title: 'Existencia', dataIndex: 'existencia', key: 'existencia', width: 110, align: 'right',
                                                render: (v) => _jsx(Text, { style: { color: '#f46a6a', fontWeight: 600, fontSize: 13 }, children: v.toLocaleString('es-DO') }) },
                                            { title: 'Costo', dataIndex: 'ultimoCosto', key: 'ultimoCosto', width: 160, align: 'right',
                                                render: (v) => _jsx(Text, { style: { fontSize: 13 }, children: v != null ? formatNumber(v) : '-' }) },
                                            { title: 'Almacén', dataIndex: 'almacen', key: 'almacen', width: 180, render: (v) => _jsx(Text, { style: { fontSize: 13 }, children: v?.trim() || '-' }) },
                                        ] })) : (_jsx("div", { className: "dashboard-panel-empty", children: _jsxs("span", { className: "paces-text-secondary", children: [_jsx(CheckCircleOutlined, {}), " No hay productos con stock negativo en esta sucursal"] }) }))] }) }) })), _jsxs(Row, { gutter: [16, 16], style: { marginTop: 24 }, children: [_jsx(Col, { xs: 24, lg: 12, children: _jsxs("div", { className: "dashboard-side-card", children: [_jsx("div", { className: "dashboard-side-card-header", children: _jsxs("span", { children: [_jsx(UserOutlined, {}), " Informaci\u00F3n del Usuario"] }) }), _jsxs("div", { className: "dashboard-side-card-body", children: [_jsxs("div", { className: "dashboard-user-summary", children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: usuario?.id ?? 0, fallback: usuario?.nombre?.charAt(0)?.toUpperCase() || 'U', size: 48 }), _jsxs("div", { className: "dashboard-user-meta", children: [_jsx("span", { className: "dashboard-user-name", children: usuario?.nombre || '-' }), _jsxs("span", { className: "dashboard-user-handle paces-text-secondary", children: ["@", usuario?.nombreUsuario] })] })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: _jsxs(Row, { gutter: [16, 12], children: [_jsxs(Col, { span: 12, children: [_jsx(Text, { strong: true, className: "paces-text-secondary", style: { fontSize: 12, display: 'block' }, children: "Nombre:" }), _jsx(Text, { style: { fontSize: 13, fontWeight: 500 }, children: usuario?.nombre || '-' })] }), _jsxs(Col, { span: 12, children: [_jsx(Text, { strong: true, className: "paces-text-secondary", style: { fontSize: 12, display: 'block' }, children: "Usuario:" }), _jsx(Text, { style: { fontSize: 13, fontWeight: 500 }, children: usuario?.nombreUsuario || '-' })] }), _jsxs(Col, { span: 12, children: [_jsx(Text, { strong: true, className: "paces-text-secondary", style: { fontSize: 12, display: 'block' }, children: "Empleado:" }), _jsx(Text, { style: { fontSize: 13, fontWeight: 500 }, children: usuario?.empleado || '-' })] })] }) })] })] }) }), _jsx(Col, { xs: 24, lg: 12, children: _jsxs("div", { className: "dashboard-side-card", children: [_jsxs("div", { className: "dashboard-side-card-header", children: [_jsxs("span", { children: [_jsx(RocketOutlined, {}), " Accesos R\u00E1pidos"] }), _jsxs("div", { className: "dashboard-quick-meta", children: [_jsxs("span", { className: "dashboard-quick-count", children: [pantallasVisibles.length, " de ", todasPantallas.length] }), _jsx(Tooltip, { title: "Configurar accesos r\u00E1pidos", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(SettingOutlined, {}), onClick: () => setConfigOpen(true) }) })] })] }), _jsx("div", { className: "dashboard-side-card-body", children: pantallasVisibles.length === 0 ? (_jsxs("div", { className: "dashboard-quick-empty", children: [_jsx(Text, { className: "paces-text-secondary", children: "No hay accesos configurados" }), _jsx("br", {}), _jsx(Button, { type: "link", size: "small", onClick: () => setConfigOpen(true), children: "Configurar ahora" })] })) : (_jsx(Row, { gutter: [10, 10], children: pantallasVisibles.map((p) => (_jsx(Col, { span: 12, children: _jsx("div", { className: "dashboard-quick-item", onClick: () => navigate(`/${p.codigo}`), children: p.nombre }) }, p.codigo))) })) })] }) })] })] })), _jsxs(Modal, { title: "Configurar Accesos R\u00E1pidos", open: configOpen, onCancel: () => setConfigOpen(false), onOk: handleGuardarConfig, okText: "Guardar", width: 480, children: [_jsx(Text, { className: "paces-text-secondary", style: { display: 'block', marginBottom: 12 }, children: "Selecciona las pantallas que quieres mostrar en Accesos R\u00E1pidos del dashboard:" }), _jsx(Input, { placeholder: "Buscar pantalla...", allowClear: true, value: busqueda, onChange: (e) => setBusqueda(e.target.value), style: { marginBottom: 12 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx("div", { style: { maxHeight: 350, overflowY: 'auto' }, children: todasPantallas
                            .filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                            .map((p) => {
                            const checked = selected.includes(p.codigo);
                            return (_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px 0',
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                }, className: "paces-row-hover", onClick: () => {
                                    if (checked) {
                                        setSelected((prev) => prev.filter((c) => c !== p.codigo));
                                    }
                                    else {
                                        setSelected((prev) => [...prev, p.codigo]);
                                    }
                                }, children: [_jsx(Checkbox, { checked: checked, style: { pointerEvents: 'none' } }), _jsx("span", { style: { marginLeft: 8, userSelect: 'none' }, children: p.nombre })] }, p.codigo));
                        }) })] })] }));
};
export default Dashboard;
