import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, message, Card, Button, Tooltip, Space, Tag, Modal, Descriptions, Typography, Progress, Select, Input, Empty, Grid, Divider, Alert, } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, WarningFilled, WarningOutlined, ClockCircleOutlined, CheckCircleOutlined, } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { ncfApi } from '../../api/ncfApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const formatearFecha = (fecha) => {
    if (!fecha)
        return '-';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime()))
            return fecha;
        return d.toLocaleDateString('es-DO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
    catch {
        return fecha;
    }
};
const { Text } = Typography;
const SecuenciasNCF = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const toTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const getDiasRestantes = (fecha) => {
        if (!fecha)
            return null;
        const ahora = new Date();
        const venc = new Date(fecha);
        const diff = venc.getTime() - ahora.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };
    // Estados
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todas');
    const [filtroVencimiento, setFiltroVencimiento] = useState('todas');
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [modalProntoVisible, setModalProntoVisible] = useState(false);
    const screens = Grid.useBreakpoint();
    const modalWidth = screens.lg ? 600 : '92vw';
    // Carga de datos
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['secuenciasNCF', sucursalActiva],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return [];
            const result = await ncfApi.obtenerListado(sucursalActiva);
            return result || [];
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MSecuenciaNCF');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    // Handlers
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones' && c.key !== 'estado');
        exportToExcel({
            fileName: `SecuenciasNCF_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Secuencias NCF',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filteredData.map((item) => cols.map((col) => {
                if (col.key === 'rango') {
                    return `${item.secuenciaInicial || ''} → ${item.secuenciaFinal || ''}`;
                }
                if (col.key === 'consumo') {
                    const usado = item.usado ?? 0;
                    const cantidad = item.cantidad ?? 0;
                    const pct = cantidad > 0 ? Math.round((usado / cantidad) * 100) : 0;
                    return `${usado}/${cantidad} (${pct}%)`;
                }
                if (col.key === 'disponible') {
                    return String((item.cantidad ?? 0) - (item.usado ?? 0));
                }
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = useCallback((value) => {
        setSearchText(value);
        setPagina(1);
    }, []);
    // Resumen
    const totalActivas = useMemo(() => (data || []).filter((s) => s.activo).length, [data]);
    const vencidas = useMemo(() => (data || []).filter((s) => s.fechaVencimiento && new Date(s.fechaVencimiento) < new Date()).length, [data]);
    const enAlerta = useMemo(() => (data || []).filter((s) => s.activo && (s.cantidad - s.usado) <= s.minimo).length, [data]);
    // Filtrado local
    const filteredData = useMemo(() => {
        let result = [...(data || [])];
        // Búsqueda por texto
        if (searchText) {
            const q = searchText.toLowerCase();
            result = result.filter((s) => (s.tipoComprobante?.toLowerCase() || '').includes(q) ||
                (s.codigo?.toLowerCase() || '').includes(q) ||
                (s.secuenciaInicial?.toLowerCase() || '').includes(q) ||
                (s.secuenciaFinal?.toLowerCase() || '').includes(q) ||
                (s.codigoTipoCliente?.toLowerCase() || '').includes(q));
        }
        // Filtro por estado
        if (filtroEstado !== 'todas') {
            const ahora = new Date();
            result = result.filter((s) => {
                switch (filtroEstado) {
                    case 'activas':
                        return s.activo;
                    case 'inactivas':
                        return !s.activo;
                    case 'alerta':
                        return s.activo && (s.cantidad - s.usado) <= s.minimo;
                    case 'vencidas':
                        return !!s.fechaVencimiento && new Date(s.fechaVencimiento) < ahora;
                    default:
                        return true;
                }
            });
        }
        // Filtro por vencimiento
        if (filtroVencimiento !== 'todas') {
            const ahora = new Date();
            result = result.filter((s) => {
                if (!s.fechaVencimiento)
                    return false;
                const diffDays = Math.ceil((new Date(s.fechaVencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
                switch (filtroVencimiento) {
                    case '30':
                        return diffDays >= 0 && diffDays <= 30;
                    case '90':
                        return diffDays >= 0 && diffDays <= 90;
                    case 'vencida':
                        return diffDays < 0;
                    default:
                        return true;
                }
            });
        }
        return result;
    }, [data, searchText, filtroEstado, filtroVencimiento]);
    // Columnas
    const columns = [
        {
            title: 'Tipo Comprobante',
            dataIndex: 'tipoComprobante',
            key: 'tipoComprobante',
            width: 320,
            render: (val, record) => (_jsxs(_Fragment, { children: [_jsx(Text, { strong: true, style: { cursor: 'pointer' }, onClick: () => {
                            setDetalleItem(record);
                            setDetalleVisible(true);
                        }, children: toTitleCase(val ?? '') }), record.codigoTipoCliente && (_jsx(Tag, { style: { marginLeft: 4, fontSize: 10 }, children: record.codigoTipoCliente }))] })),
        },
        {
            title: 'Rango NCF',
            key: 'rango',
            width: 200,
            render: (_, record) => (_jsxs(Text, { style: { fontFamily: 'monospace', fontSize: 11 }, children: [record.secuenciaInicial, " \u00E2\u2020' ", record.secuenciaFinal] })),
        },
        {
            title: 'Consumo',
            key: 'consumo',
            width: 240,
            render: (_, record) => {
                const usado = record.usado ?? 0;
                const cantidad = record.cantidad ?? 0;
                const pct = cantidad > 0 ? Math.round((usado / cantidad) * 100) : 0;
                const disponible = cantidad - usado;
                const color = pct >= 90 ? '#f46a6a' : pct >= 70 ? '#f1b44c' : '#34c38f';
                return (_jsxs("div", { children: [_jsx(Tooltip, { title: `${usado.toLocaleString('es-DO')} de ${cantidad.toLocaleString('es-DO')} usados (${pct}%). Disponible: ${disponible.toLocaleString('es-DO')}. Mínimo configurado: ${(record.minimo ?? 0).toLocaleString('es-DO')}.`, children: _jsx(Progress, { percent: pct, size: "small", showInfo: false, strokeColor: color }) }), _jsxs(Text, { type: "secondary", style: { fontSize: 11 }, children: [usado.toLocaleString('es-DO'), " / ", cantidad.toLocaleString('es-DO'), " usados"] })] }));
            },
        },
        {
            title: 'Disponible',
            key: 'disponible',
            width: 100,
            align: 'right',
            render: (_, record) => {
                const disponible = (record.cantidad ?? 0) - (record.usado ?? 0);
                const enAlerta = disponible <= (record.minimo ?? 0);
                return (_jsx(Text, { style: {
                        color: enAlerta ? '#f46a6a' : undefined,
                        fontWeight: enAlerta ? 600 : undefined,
                    }, children: disponible.toLocaleString('es-DO') }));
            },
        },
        {
            title: 'Vencimiento',
            dataIndex: 'fechaVencimiento',
            key: 'fechaVencimiento',
            width: 150,
            render: (val) => {
                if (!val)
                    return _jsx(Text, { type: "secondary", children: "\u2014" });
                const dias = getDiasRestantes(val);
                if (dias === null)
                    return _jsx(Text, { type: "secondary", children: "\u2014" });
                if (dias < 0) {
                    return (_jsxs(Space, { children: [_jsx(WarningFilled, { style: { color: '#f46a6a' } }), _jsx(Text, { children: formatearFecha(val) }), _jsx(Tag, { color: "error", style: { marginLeft: 4 }, children: "Vencida" })] }));
                }
                if (dias <= 30) {
                    return (_jsxs(Space, { children: [_jsx(ClockCircleOutlined, { style: { color: '#f1b44c' } }), _jsx(Text, { children: formatearFecha(val) }), _jsxs(Tag, { color: "warning", style: { marginLeft: 4 }, children: ["Vence en ", dias, " d\u00EDa", dias !== 1 ? 's' : ''] })] }));
                }
                if (dias <= 90) {
                    return (_jsxs(Space, { children: [_jsx(Text, { children: formatearFecha(val) }), _jsxs(Text, { type: "secondary", style: { fontSize: 11 }, children: ["en ", dias, " d\u00EDa", dias !== 1 ? 's' : ''] })] }));
                }
                return _jsx(Text, { children: formatearFecha(val) });
            },
        },
        {
            title: 'Estado',
            key: 'estado',
            width: 110,
            render: (_, record) => {
                const disponible = (record.cantidad ?? 0) - (record.usado ?? 0);
                const pct = record.cantidad > 0 ? Math.round(((record.usado ?? 0) / record.cantidad) * 100) : 0;
                if (!record.activo)
                    return _jsx(Tag, { color: "default", children: "Inactiva" });
                if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date())
                    return _jsx(Tag, { color: "error", children: "Vencida" });
                if (disponible <= (record.minimo ?? 0))
                    return _jsx(Tag, { color: "warning", children: "En alerta" });
                if (pct >= 90)
                    return _jsx(Tag, { color: "warning", children: "Por agotarse" });
                return _jsx(Tag, { color: "success", children: "Activa" });
            },
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                }, children: [_jsx("div", { children: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [totalActivas, " activas \u00B7 ", enAlerta, " pr\u00F3x. a agotarse \u00B7 ", vencidas, " vencidas"] }) }), _jsx(PermissionGate, { accion: "CREAR", children: _jsxs(Button, { type: "default", icon: _jsx(PlusOutlined, {}), onClick: () => setModalProntoVisible(true), children: ["Nueva Secuencia", ' ', _jsx(Tag, { color: "orange", style: { marginLeft: 4, fontSize: 10 }, children: "Pronto" })] }) })] }), isError && (_jsx(Alert, { message: "Error al cargar secuencias NCF", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPagina(1); }, onReload: () => refetch(), onExportarExcel: handleExportarExcel, filtros: _jsxs(_Fragment, { children: [_jsx(Select, { style: { width: 160 }, value: filtroEstado, onChange: (value) => { setFiltroEstado(value); setPagina(1); }, options: [
                                        { value: "todas", label: "Todas" },
                                        { value: "activas", label: "Activas" },
                                        { value: "inactivas", label: "Inactivas" },
                                        { value: "alerta", label: "En alerta" },
                                        { value: "vencidas", label: "Vencidas" },
                                    ] }), _jsx(Select, { style: { width: 180 }, value: filtroVencimiento, onChange: (value) => { setFiltroVencimiento(value); setPagina(1); }, options: [
                                        { value: "todas", label: "Todas" },
                                        { value: "30", label: "Vence en 30 días" },
                                        { value: "90", label: "Vence en 90 días" },
                                        { value: "vencida", label: "Vencida" },
                                    ] })] }) }), _jsx(Table, { columns: columns, dataSource: filteredData, rowKey: "idExterno", loading: isLoading, scroll: { x: 1200 }, size: "middle", onRow: (record) => ({
                            style: {
                                borderLeft: !record.activo
                                    ? '3px solid transparent'
                                    : record.fechaVencimiento &&
                                        new Date(record.fechaVencimiento) < new Date()
                                        ? '3px solid #f46a6a'
                                        : record.cantidad - record.usado <= record.minimo
                                            ? '3px solid #f1b44c'
                                            : undefined,
                                opacity: !record.activo ? 0.65 : 1,
                            },
                        }), pagination: {
                            current: pagina,
                            pageSize,
                            onChange: (p) => setPagina(p),
                            showSizeChanger: false,
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} secuencias`,
                        }, locale: {
                            emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (data || []).length === 0 ? (_jsx(Empty, { description: "No hay secuencias NCF registradas" })) : (_jsx(Empty, { description: "No se encontraron secuencias para los filtros aplicados", children: _jsx(Button, { type: "link", onClick: () => {
                                            setSearchText('');
                                            setFiltroEstado('todas');
                                            setFiltroVencimiento('todas');
                                            setPagina(1);
                                        }, children: "Limpiar filtros" }) })) })),
                        } })] }), _jsx(Modal, { title: "Detalle de Secuencia NCF", open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: modalWidth, children: detalleItem && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs(Typography.Title, { level: 5, children: [toTitleCase(detalleItem.tipoComprobante ?? ''), _jsx(Tag, { color: detalleItem.activo ? 'success' : 'default', style: { marginLeft: 8 }, children: detalleItem.activo ? 'Activa' : 'Inactiva' }), _jsx(Tag, { style: { marginLeft: 4 }, children: detalleItem.codigoTipoCliente })] }), _jsxs(Text, { type: "secondary", children: ["C\u00F3digo: ", detalleItem.codigo, " \u00B7 Tipo cliente:", ' ', detalleItem.codigoTipoCliente] })] }), _jsx(Divider, { children: "Consumo" }), (() => {
                            const usado = detalleItem.usado ?? 0;
                            const cantidad = detalleItem.cantidad ?? 0;
                            const disponible = cantidad - usado;
                            const minimo = detalleItem.minimo ?? 0;
                            const pct = cantidad > 0 ? Math.round((usado / cantidad) * 100) : 0;
                            const color = pct >= 90 ? '#f46a6a' : pct >= 70 ? '#f1b44c' : '#34c38f';
                            return (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsx(Progress, { percent: pct, strokeWidth: 14, style: { width: '100%', maxWidth: 480 }, strokeColor: color }) }), _jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "Usados", children: usado.toLocaleString('es-DO') }), _jsx(Descriptions.Item, { label: "Disponibles", children: disponible.toLocaleString('es-DO') }), _jsx(Descriptions.Item, { label: "Cantidad total", children: cantidad.toLocaleString('es-DO') }), _jsx(Descriptions.Item, { label: "M\u00EDnimo", children: _jsxs(Space, { children: [_jsx("span", { children: minimo.toLocaleString('es-DO') }), disponible > minimo ? (_jsx(CheckCircleOutlined, { style: { color: '#34c38f' } })) : (_jsx(WarningOutlined, { style: { color: '#f46a6a' } }))] }) })] })] }));
                        })(), _jsx(Divider, { children: "Rango de secuencia" }), _jsxs(Descriptions, { column: 1, bordered: true, size: "small", children: [_jsx(Descriptions.Item, { label: "Inicial", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: detalleItem.secuenciaInicial }) }), _jsx(Descriptions.Item, { label: "Final", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: detalleItem.secuenciaFinal }) }), _jsx(Descriptions.Item, { label: "D\u00EDgitos", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: detalleItem.digitos }) })] }), _jsx(Divider, { children: "Vigencia" }), _jsx(Descriptions, { column: 1, bordered: true, size: "small", children: _jsx(Descriptions.Item, { label: "Fecha Vencimiento", children: detalleItem.fechaVencimiento ? (_jsxs(Space, { children: [_jsx("span", { children: formatearFecha(detalleItem.fechaVencimiento) }), (() => {
                                            const dias = getDiasRestantes(detalleItem.fechaVencimiento);
                                            if (dias === null)
                                                return null;
                                            if (dias < 0)
                                                return _jsx(Tag, { color: "error", children: "Vencida" });
                                            if (dias <= 30)
                                                return (_jsxs(Tag, { color: "warning", children: ["Vence en ", dias, " d\u00EDa", dias !== 1 ? 's' : ''] }));
                                            return null;
                                        })()] })) : (_jsx(Text, { type: "secondary", children: "\u2014" })) }) })] })) }), _jsxs(Modal, { title: "Nueva Secuencia NCF", open: modalProntoVisible, onCancel: () => setModalProntoVisible(false), footer: _jsx(Button, { type: "primary", onClick: () => setModalProntoVisible(false), children: "Entendido" }), children: [_jsx("p", { children: "La funcionalidad de registro de secuencias NCF est\u00E1 en desarrollo." }), _jsx("p", { children: "Mientras tanto, las secuencias se gestionan desde el m\u00F3dulo Desktop o mediante importaci\u00F3n desde DGII." })] })] }));
};
export default SecuenciasNCF;
