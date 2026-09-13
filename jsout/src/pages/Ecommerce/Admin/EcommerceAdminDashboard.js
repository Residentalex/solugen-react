import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Button, Typography, message, Table, Tag, Progress, Spin, Badge, Segmented, Tooltip, theme, Space, Empty, Input } from 'antd';
import { ShoppingOutlined, OrderedListOutlined, TagsOutlined, PictureOutlined, SyncOutlined, SettingOutlined, ArrowRightOutlined, DollarOutlined, RiseOutlined, FallOutlined, ShoppingCartOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, RightCircleOutlined, SearchOutlined, ReloadOutlined, CreditCardOutlined, TeamOutlined, RocketOutlined, AppstoreOutlined, InboxOutlined, StarOutlined, BellOutlined, ExclamationCircleOutlined, FileTextOutlined, WalletOutlined, ShopOutlined } from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
const { Text, Title } = Typography;
const { useToken } = theme;
const ESTADO_TAG = {
    PENDIENTE: { color: 'warning', icon: _jsx(ClockCircleOutlined, {}) },
    PROCESANDO: { color: 'processing', icon: _jsx(SyncOutlined, { spin: true }) },
    ENVIADO: { color: 'cyan', icon: _jsx(RocketOutlined, {}) },
    COMPLETADO: { color: 'success', icon: _jsx(CheckCircleOutlined, {}) },
    CANCELADO: { color: 'error', icon: _jsx(CloseCircleOutlined, {}) },
};
const KPI_ICONS = {
    catalogo: _jsx(ShopOutlined, { style: { fontSize: 22 } }),
    pendientes: _jsx(ClockCircleOutlined, { style: { fontSize: 22 } }),
    categorias: _jsx(AppstoreOutlined, { style: { fontSize: 22 } }),
    banners: _jsx(PictureOutlined, { style: { fontSize: 22 } }),
};
const KPI_COLORS = {
    catalogo: '#556ee6',
    pendientes: '#f46a6a',
    categorias: '#34c38f',
    banners: '#f1b44c',
};
const EcommerceAdminDashboard = () => {
    const navigate = useNavigate();
    const { token } = useToken();
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [ordenes, setOrdenes] = useState([]);
    const [ordenesLoading, setOrdenesLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [periodo, setPeriodo] = useState('mes');
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [res, ord] = await Promise.all([
                ecommerceApi.adminObtenerResumen(),
                ecommerceApi.adminObtenerOrdenes({ pagina: 1, tamano: 10 }),
            ]);
            setResumen(res);
            setOrdenes(ord.items || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);
    const handleSincronizar = async () => {
        setSyncing(true);
        try {
            await ecommerceApi.adminSincronizar();
            message.success('¡Sincronización completada exitosamente!');
            cargarDatos();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al sincronizar');
        }
        finally {
            setSyncing(false);
        }
    };
    // ── Filtrado de órdenes ──
    const ordenesFiltradas = useMemo(() => {
        if (!busqueda)
            return ordenes;
        const q = busqueda.toLowerCase();
        return ordenes.filter((o) => o.nombreCliente?.toLowerCase().includes(q) ||
            o.email?.toLowerCase().includes(q) ||
            String(o.noOrden).includes(q) ||
            o.estado?.toLowerCase().includes(q));
    }, [ordenes, busqueda]);
    // ── Órdenes por estado ──
    const ordenesPorEstado = useMemo(() => {
        const estados = {};
        for (const o of ordenes) {
            estados[o.estado] = (estados[o.estado] || 0) + 1;
        }
        // Calcular total de ingresos de órdenes completadas
        const totalIngresos = ordenes
            .filter((o) => o.estado === 'COMPLETADO')
            .reduce((sum, o) => sum + o.total, 0);
        return { estados, totalIngresos };
    }, [ordenes]);
    // ── KPIs ──
    const kpis = useMemo(() => [
        {
            key: 'catalogo',
            titulo: 'Productos en Catálogo',
            valor: resumen?.totalProductosCatalogo ?? 0,
            path: '/EProductos',
            tendencia: '+12%',
            tendenciaUp: true,
        },
        {
            key: 'pendientes',
            titulo: 'Órdenes Pendientes',
            valor: resumen?.totalOrdenesPendientes ?? 0,
            path: '/EOrdenes',
            tendencia: resumen?.totalOrdenesPendientes
                ? `+${resumen.totalOrdenesPendientes} hoy`
                : 'Sin cambios',
            tendenciaUp: (resumen?.totalOrdenesPendientes ?? 0) > 0,
        },
        {
            key: 'categorias',
            titulo: 'Categorías',
            valor: resumen?.totalCategorias ?? 0,
            path: '/ECategorias',
            tendencia: `${(resumen?.totalCategorias ?? 0) > 0 ? 'Activas' : 'Sin datos'}`,
            tendenciaUp: true,
        },
        {
            key: 'banners',
            titulo: 'Banners Activos',
            valor: resumen?.totalBannersActivos ?? 0,
            path: '/EBanners',
            tendencia: `${(resumen?.totalBannersActivos ?? 0) > 0 ? 'Publicando' : 'Sin campaña'}`,
            tendenciaUp: (resumen?.totalBannersActivos ?? 0) > 0,
        },
    ], [resumen]);
    // ── Columnas de la tabla ──
    const columns = [
        {
            title: 'No. Orden',
            dataIndex: 'noOrden',
            key: 'noOrden',
            width: 110,
            sorter: (a, b) => a.noOrden - b.noOrden,
            render: (val) => _jsxs(Text, { strong: true, style: { color: token.colorPrimary }, children: ["#", String(val).padStart(6, '0')] }),
        },
        {
            title: 'Cliente',
            dataIndex: 'nombreCliente',
            key: 'nombreCliente',
            ellipsis: true,
            sorter: (a, b) => a.nombreCliente.localeCompare(b.nombreCliente),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            ellipsis: true,
            responsive: ['lg'],
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            align: 'right',
            sorter: (a, b) => a.total - b.total,
            render: (val) => (_jsxs(Text, { strong: true, style: { color: token.colorText }, children: ["RD$ ", val.toLocaleString('es-DO', { minimumFractionDigits: 2 })] })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 150,
            filters: Object.keys(ESTADO_TAG).map((k) => ({ text: k, value: k })),
            onFilter: (value, record) => record.estado === value,
            render: (estado) => {
                const cfg = ESTADO_TAG[estado] || { color: 'default', icon: _jsx(RightCircleOutlined, {}) };
                return _jsx(Tag, { color: cfg.color, icon: cfg.icon, style: { borderRadius: 12, padding: '2px 12px' }, children: estado });
            },
        },
    ];
    const totalIngresos = ordenesPorEstado.totalIngresos;
    const totalOrdenes = ordenes.length;
    return (_jsxs("div", { style: { animation: 'fadeIn 0.4s ease' }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 28, flexWrap: 'wrap', gap: 12
                }, children: [_jsxs("div", { children: [_jsx(Title, { level: 3, style: { margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }, children: "Dashboard Ecommerce" }), _jsx(Text, { type: "secondary", style: { fontSize: 14, marginTop: 4, display: 'block' }, children: "Panel de control y monitoreo de tu tienda online" })] }), _jsxs(Space, { wrap: true, children: [_jsx(Button, { icon: _jsx(SettingOutlined, {}), onClick: () => navigate('/EConfig'), style: { borderRadius: 10 }, children: "Configuraci\u00F3n" }), _jsx(Button, { type: "primary", icon: _jsx(SyncOutlined, { spin: syncing }), loading: syncing, onClick: handleSincronizar, style: { borderRadius: 10, boxShadow: token.boxShadow }, children: "Sincronizar Productos" })] })] }), _jsx(Row, { gutter: [20, 20], style: { marginBottom: 24 }, children: kpis.map((kpi) => (_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Card, { hoverable: true, style: {
                            borderRadius: 18,
                            border: 'none',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                            background: token.colorBgContainer,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            height: '100%',
                        }, styles: { body: { padding: 24 } }, onMouseEnter: (e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
                        }, onClick: () => navigate(kpi.path), children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 13, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }, children: kpi.titulo }), _jsx("div", { style: { fontSize: 32, fontWeight: 700, color: token.colorTextHeading, marginTop: 8, lineHeight: 1.1 }, children: kpi.valor }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }, children: [kpi.tendenciaUp
                                                    ? _jsx(RiseOutlined, { style: { color: '#34c38f', fontSize: 12 } })
                                                    : _jsx(FallOutlined, { style: { color: '#f46a6a', fontSize: 12 } }), _jsx(Text, { style: { fontSize: 12, color: kpi.tendenciaUp ? '#34c38f' : '#f46a6a', fontWeight: 500 }, children: kpi.tendencia })] })] }), _jsx("div", { style: {
                                        width: 48, height: 48, borderRadius: 14,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `${KPI_COLORS[kpi.key]}12`,
                                        color: KPI_COLORS[kpi.key],
                                        flexShrink: 0,
                                    }, children: KPI_ICONS[kpi.key] })] }) }) }, kpi.key))) }), _jsxs(Row, { gutter: [20, 20], style: { marginBottom: 24 }, children: [_jsx(Col, { xs: 24, lg: 16, children: _jsxs(Card, { style: {
                                borderRadius: 18,
                                border: 'none',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                height: '100%',
                            }, styles: { body: { padding: 24 } }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Title, { level: 5, style: { margin: 0, fontWeight: 600 }, children: "Resumen de \u00D3rdenes" }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Distribuci\u00F3n y m\u00E9tricas principales" })] }), _jsx(Segmented, { value: periodo, onChange: (val) => setPeriodo(val), options: [
                                                { value: 'dia', label: 'Día' },
                                                { value: 'semana', label: 'Semana' },
                                                { value: 'mes', label: 'Mes' },
                                                { value: 'ano', label: 'Año' },
                                            ], style: { borderRadius: 10, fontSize: 12 } })] }), _jsxs(Row, { gutter: [16, 16], children: [_jsx(Col, { xs: 24, sm: 8, children: _jsxs("div", { style: { textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }, children: [_jsx("div", { style: { fontSize: 28, fontWeight: 700, color: token.colorTextHeading }, children: totalOrdenes }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Total \u00D3rdenes" })] }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsxs("div", { style: { textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }, children: [_jsx("div", { style: { fontSize: 28, fontWeight: 700, color: '#34c38f' }, children: (resumen?.totalProductosCatalogo ?? 0) > 0 ? 'Activo' : 'Inactivo' }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Estado Tienda" })] }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsxs("div", { style: { textAlign: 'center', padding: '16px 8px', borderRadius: 14, background: 'var(--paces-hover-bg)' }, children: [_jsx("div", { style: { fontSize: 28, fontWeight: 700, color: '#f1b44c' }, children: resumen?.totalBannersActivos ?? 0 }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Campa\u00F1as Activas" })] }) })] }), _jsxs("div", { style: { marginTop: 20 }, children: [_jsx(Text, { strong: true, style: { fontSize: 13, marginBottom: 12, display: 'block' }, children: "Estado de las \u00D3rdenes" }), _jsx(Space, { direction: "vertical", style: { width: '100%' }, size: 10, children: Object.entries(ordenesPorEstado.estados).length > 0 ? (Object.entries(ordenesPorEstado.estados).map(([estado, count]) => {
                                                const cfg = ESTADO_TAG[estado] || { color: 'default', icon: _jsx(RightCircleOutlined, {}) };
                                                const pct = totalOrdenes > 0 ? Math.round((count / totalOrdenes) * 100) : 0;
                                                const barColor = estado === 'COMPLETADO' ? '#34c38f' :
                                                    estado === 'CANCELADO' ? '#f46a6a' :
                                                        estado === 'PROCESANDO' ? '#556ee6' :
                                                            estado === 'ENVIADO' ? '#50a5f1' :
                                                                '#f1b44c';
                                                return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx(Tag, { color: cfg.color, style: { width: 120, borderRadius: 10, textAlign: 'center', margin: 0 }, children: estado }), _jsx(Progress, { percent: pct, strokeColor: barColor, trailColor: "var(--paces-border)", showInfo: false, style: { flex: 1, margin: 0 }, size: "small" }), _jsx(Text, { strong: true, style: { width: 40, textAlign: 'right', fontSize: 13 }, children: count })] }, estado));
                                            })) : (_jsx(Empty, { description: "Sin \u00F3rdenes registradas", image: Empty.PRESENTED_IMAGE_SIMPLE })) })] })] }) }), _jsx(Col, { xs: 24, lg: 8, children: _jsxs(Card, { style: {
                                borderRadius: 18,
                                border: 'none',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                height: '100%',
                            }, styles: { body: { padding: 24 } }, children: [_jsx(Title, { level: 5, style: { margin: '0 0 20px 0', fontWeight: 600 }, children: "M\u00E9tricas R\u00E1pidas" }), _jsxs(Space, { direction: "vertical", size: 16, style: { width: '100%' }, children: [_jsxs("div", { style: { padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: `${token.colorPrimary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorPrimary }, children: _jsx(ShoppingOutlined, { style: { fontSize: 20 } }) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }, children: "Productos" }), _jsx("div", { style: { fontSize: 18, fontWeight: 700, color: token.colorTextHeading }, children: resumen?.totalProductosCatalogo ?? 0 })] })] }), _jsxs("div", { style: { padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: '#34c38f18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34c38f' }, children: _jsx(CheckCircleOutlined, { style: { fontSize: 20 } }) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }, children: "Meta del Mes" }), _jsx(Progress, { percent: totalOrdenes > 0 ? Math.min(100, Math.round((ordenes.filter(o => o.estado === 'COMPLETADO').length / Math.max(totalOrdenes, 1)) * 100)) : 0, size: "small", style: { margin: '4px 0 0' } })] })] }), _jsxs("div", { style: { padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: '#f1b44c18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f1b44c' }, children: _jsx(TagsOutlined, { style: { fontSize: 20 } }) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }, children: "Categor\u00EDas" }), _jsx("div", { style: { fontSize: 18, fontWeight: 700, color: token.colorTextHeading }, children: resumen?.totalCategorias ?? 0 })] })] }), _jsxs("div", { style: { padding: 16, borderRadius: 14, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: '#f46a6a18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f46a6a' }, children: _jsx(BellOutlined, { style: { fontSize: 20 } }) }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3px' }, children: "Pendientes" }), _jsx("div", { style: { fontSize: 18, fontWeight: 700, color: token.colorTextHeading }, children: resumen?.totalOrdenesPendientes ?? 0 })] })] })] }), totalIngresos > 0 && (_jsxs("div", { style: { marginTop: 20, padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, var(--paces-primary) 0%, var(--paces-primary-hover) 100%)', textAlign: 'center' }, children: [_jsx(Text, { style: { color: '#fff', fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }, children: "Ingresos Completados" }), _jsxs("div", { style: { color: '#fff', fontSize: 24, fontWeight: 700, marginTop: 4 }, children: ["RD$ ", totalIngresos.toLocaleString('es-DO', { minimumFractionDigits: 2 })] })] }))] }) })] }), _jsx(Row, { gutter: [20, 20], style: { marginBottom: 24 }, children: _jsx(Col, { xs: 24, lg: 24, children: _jsxs(Card, { style: {
                            borderRadius: 18,
                            border: 'none',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        }, styles: { body: { padding: 0 } }, children: [_jsxs("div", { style: { padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Title, { level: 5, style: { margin: 0, fontWeight: 600 }, children: "\u00DAltimas Transacciones" }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "\u00D3rdenes recientes del ecommerce" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Input.Search, { placeholder: "Buscar orden...", allowClear: true, onSearch: (val) => setBusqueda(val), style: { width: 280, borderRadius: 10 }, prefix: _jsx(SearchOutlined, { style: { color: 'var(--paces-text-secondary)' } }) }), _jsx(Tooltip, { title: "Recargar", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarDatos, style: { borderRadius: 10 } }) }), _jsxs(Button, { type: "link", onClick: () => navigate('/EOrdenes'), style: { borderRadius: 10 }, children: ["Ver todas ", _jsx(ArrowRightOutlined, {})] })] })] }), _jsx(Table, { dataSource: ordenesFiltradas, columns: columns, rowKey: "id", loading: loading, pagination: false, style: { marginTop: 8 }, className: "paces-list-table", locale: { emptyText: _jsx(Empty, { description: "No hay \u00F3rdenes registradas", image: Empty.PRESENTED_IMAGE_SIMPLE }) }, onRow: (record) => ({
                                    onClick: () => navigate(`/EOrdenes`),
                                    style: { cursor: 'pointer' },
                                }) }), ordenes.length > 10 && (_jsx("div", { style: { padding: '12px 24px', textAlign: 'right', borderTop: '1px solid var(--paces-border)' }, children: _jsxs(Button, { type: "text", onClick: () => navigate('/EOrdenes'), children: ["Ver todas las \u00F3rdenes ", _jsx(ArrowRightOutlined, {})] }) }))] }) }) }), _jsx(Row, { gutter: [20, 20], children: _jsx(Col, { xs: 24, children: _jsxs(Card, { style: {
                            borderRadius: 18,
                            border: 'none',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        }, styles: { body: { padding: 24 } }, children: [_jsx(Title, { level: 5, style: { margin: '0 0 20px 0', fontWeight: 600 }, children: "Accesos R\u00E1pidos" }), _jsx(Row, { gutter: [12, 12], children: [
                                    { icon: _jsx(ShoppingOutlined, {}), label: 'Gestionar Productos', path: '/EProductos', color: '#556ee6' },
                                    { icon: _jsx(OrderedListOutlined, {}), label: 'Ver Órdenes', path: '/EOrdenes', color: '#34c38f' },
                                    { icon: _jsx(TagsOutlined, {}), label: 'Gestionar Categorías', path: '/ECategorias', color: '#f1b44c' },
                                    { icon: _jsx(PictureOutlined, {}), label: 'Gestionar Banners', path: '/EBanners', color: '#f46a6a' },
                                    { icon: _jsx(SettingOutlined, {}), label: 'Configuración', path: '/EConfig', color: token.colorPrimary },
                                ].map((item, idx) => (_jsx(Col, { xs: 24, sm: 12, md: 8, lg: 4, children: _jsxs(Card, { hoverable: true, style: {
                                            borderRadius: 14,
                                            border: 'none',
                                            background: 'var(--paces-hover-bg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'center',
                                        }, styles: { body: { padding: '16px 12px' } }, onMouseEnter: (e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }, onClick: () => navigate(item.path), children: [_jsx("div", { style: { fontSize: 24, color: item.color, marginBottom: 8 }, children: item.icon }), _jsx(Text, { style: { fontSize: 12, fontWeight: 500, color: token.colorText }, children: item.label })] }) }, idx))) })] }) }) })] }));
};
export default EcommerceAdminDashboard;
