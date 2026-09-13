import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Card, Input, Typography, Alert, Button, Select, Switch, Space, Popover, Badge, DatePicker, Empty, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined, FileExcelOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { almacenApi } from '../../api/almacenApi';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
const { Text } = Typography;
const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;
const TIPO_DOC_OPTIONS = [
    { value: 'ENP', label: 'Entrada Almacén' },
    { value: 'SAP', label: 'Salida Almacén' },
    { value: 'FAC', label: 'Factura Cliente' },
    { value: 'PV', label: 'Factura POS' },
    { value: 'DVC', label: 'Devolución Compra' },
    { value: 'DEV', label: 'Devolución Venta' },
];
// Configuración de columnas para el toggle de visibilidad
const ALL_COLUMNS_CONFIG = [
    { key: 'fecha', label: 'Fecha', defaultVisible: true },
    { key: 'documento', label: 'Documento', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'almacen', label: 'Almacén', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'costo', label: 'Costo', defaultVisible: true },
    { key: 'tipoDocumento', label: 'Tipo Doc.', defaultVisible: true },
    { key: 'entidad', label: 'Entidad', defaultVisible: true },
    { key: 'referencia', label: 'Referencia/Concepto', defaultVisible: false },
    { key: 'usuario', label: 'Usuario', defaultVisible: false },
    { key: 'costoUnitario', label: 'Costo Unitario', defaultVisible: false },
];
const DEFAULT_VISIBLE_KEYS = ALL_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_VISIBLE_COLUMNS_KEY = 'movProd_visibleColumns';
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${dy}000000`;
}
function parseDateRaw(val) {
    if (!val)
        return null;
    const num = val.replace(/\D/g, '');
    if (num.length === 8) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        return new Date(y, m, d);
    }
    if (num.length >= 14) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        return new Date(y, m, d);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}
function formatDate(val) {
    const d = parseDateRaw(val);
    if (!d)
        return val || '';
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatNumber(n) {
    return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toTitleCase(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
const MovimientosProductos = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(FILAS_POR_PAGINA);
    const [searchText, setSearchText] = useState('');
    const [loadingError, setLoadingError] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_VISIBLE_COLUMNS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        }
        catch {
            // ignorar error de parse
        }
        return DEFAULT_VISIBLE_KEYS;
    });
    const rangoDefault = useMemo(() => ({
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
    }), []);
    const [filtros, setFiltros] = useState({
        desde: rangoDefault.desde,
        hasta: rangoDefault.hasta,
        codigo: '',
        almacen: '',
        tipoDoc: [],
        noCuenta: '',
        existencia: true,
    });
    const [listaAlmacenes, setListaAlmacenes] = useState([]);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [draft, setDraft] = useState(filtros);
    const [generated, setGenerated] = useState(false);
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                desde: filtros.desde,
                hasta: filtros.hasta,
                cantidad: 100000,
                salto: 0,
                existencia: filtros.existencia ? 'true' : 'false',
            };
            if (filtros.codigo)
                params.codigo = filtros.codigo;
            if (filtros.almacen)
                params.almacen = filtros.almacen;
            if (filtros.tipoDoc.length > 0)
                params.tipoDoc = filtros.tipoDoc.join(',');
            if (filtros.noCuenta)
                params.noCuenta = filtros.noCuenta;
            const resultados = await movimientoApi.obtenerDetallado(sucursalActiva, params);
            setData(resultados);
            setGenerated(true);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, filtros]);
    useEffect(() => {
        setActiveModule('CMovimientosProductos');
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar]);
    useEffect(() => {
        almacenApi.obtenerListado(sucursalActiva).then(setListaAlmacenes).catch((err) => console.warn('Error al cargar lista de almacenes', err));
    }, [sucursalActiva]);
    useEffect(() => {
        try {
            localStorage.setItem(LS_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumnKeys));
        }
        catch {
            // ignorar error de storage
        }
    }, [visibleColumnKeys]);
    const handleGenerar = () => {
        setPage(1);
        setSearchText('');
        cargarDatos();
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        setLoadingError(false);
        cargarDatos();
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const columnHeaders = ['Fecha', 'Documento', 'Código', 'Artículo', 'Almacén', 'Cantidad', 'Costo', 'Tipo Doc.', 'Entidad'];
        const dataRows = datosFiltrados.map((r) => [
            formatDate(r.fecha),
            r.documento,
            r.codigo,
            toTitleCase(r.articulo) || '-',
            toTitleCase(r.almacen),
            r.cantidad ?? 0,
            r.costo ?? 0,
            r.tipoDocumento || '-',
            toTitleCase(r.entidad) || '-',
        ]);
        exportToExcel({
            companyName,
            columnHeaders,
            dataRows,
            sheetName: 'MovimientosProductos',
            columnWidths: [
                { wch: 14 },
                { wch: 18 },
                { wch: 14 },
                { wch: 30 },
                { wch: 18 },
                { wch: 12 },
                { wch: 14 },
                { wch: 12 },
                { wch: 22 },
            ],
        });
    };
    const handleTableChange = (pagination) => {
        setPage(pagination.current);
    };
    const datosFiltrados = useMemo(() => {
        if (!searchText)
            return data;
        const t = searchText.toLowerCase();
        return data.filter(d => d.codigo?.toLowerCase().includes(t) ||
            d.articulo?.toLowerCase().includes(t));
    }, [data, searchText]);
    const datosPaginados = useMemo(() => {
        const start = (page - 1) * pageSize;
        return datosFiltrados.slice(start, start + pageSize);
    }, [datosFiltrados, page, pageSize]);
    const totales = useMemo(() => {
        let cantidad = 0;
        let costo = 0;
        for (const d of datosFiltrados) {
            cantidad += d.cantidad ?? 0;
            costo += d.costo ?? 0;
        }
        return { cantidad, costo };
    }, [datosFiltrados]);
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filtros.desde !== rangoDefault.desde || filtros.hasta !== rangoDefault.hasta)
            count++;
        if (filtros.codigo)
            count++;
        if (filtros.almacen)
            count++;
        if (filtros.tipoDoc.length > 0)
            count++;
        if (filtros.noCuenta)
            count++;
        if (!filtros.existencia)
            count++;
        return count;
    }, [filtros, rangoDefault]);
    function strToDayjs(val) {
        if (!val)
            return null;
        const num = val.replace(/\D/g, '');
        if (num.length >= 14)
            return dayjs(num.slice(0, 14), 'YYYYMMDDHHmmss');
        if (num.length === 8)
            return dayjs(num, 'YYYYMMDD');
        return null;
    }
    const abrirPopover = () => {
        setDraft({ ...filtros });
        setPopoverOpen(true);
    };
    const aplicarFiltros = () => {
        setPopoverOpen(false);
        setFiltros({ ...draft });
        setPage(1);
    };
    const limpiarFiltros = () => {
        setDraft({
            desde: rangoDefault.desde,
            hasta: rangoDefault.hasta,
            codigo: '',
            almacen: '',
            tipoDoc: [],
            noCuenta: '',
            existencia: true,
        });
    };
    const { RangePicker } = DatePicker;
    const contentPopover = (_jsxs("div", { style: { width: 320 }, children: [_jsxs("div", { style: { fontWeight: 600, marginBottom: 16, fontSize: 15 }, children: [_jsx(FilterOutlined, { style: { marginRight: 8 } }), "Filtros"] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Per\u00EDodo" }), _jsx(RangePicker, { value: draft.desde && draft.hasta
                            ? [strToDayjs(draft.desde), strToDayjs(draft.hasta)]
                            : undefined, onChange: (dates) => {
                            if (dates && dates[0] && dates[1]) {
                                setDraft({ ...draft, desde: dates[0].format('YYYYMMDDHHmmss'), hasta: dates[1].format('YYYYMMDDHHmmss') });
                            }
                            else {
                                setDraft({ ...draft, desde: rangoDefault.desde, hasta: rangoDefault.hasta });
                            }
                        }, style: { width: '100%' }, placeholder: ['Desde', 'Hasta'], allowClear: true, renderExtraFooter: () => (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                        const hoy = dayjs();
                                        setDraft({ ...draft, desde: hoy.format('YYYYMMDDHHmmss'), hasta: hoy.format('YYYYMMDDHHmmss') });
                                    }, children: "Hoy" }), _jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                        const inicio = dayjs().startOf('month');
                                        const fin = dayjs();
                                        setDraft({ ...draft, desde: inicio.format('YYYYMMDDHHmmss'), hasta: fin.format('YYYYMMDDHHmmss') });
                                    }, children: "Este mes" }), _jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                        const inicio = dayjs().subtract(30, 'day');
                                        const fin = dayjs();
                                        setDraft({ ...draft, desde: inicio.format('YYYYMMDDHHmmss'), hasta: fin.format('YYYYMMDDHHmmss') });
                                    }, children: "30 d\u00EDas" })] })) })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "C\u00F3digo" }), _jsx(Input, { placeholder: "Filtrar por c\u00F3digo", allowClear: true, style: { width: '100%' }, value: draft.codigo, onChange: (e) => setDraft({ ...draft, codigo: e.target.value }) })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Almac\u00E9n" }), _jsx(Select, { placeholder: "Seleccionar almac\u00E9n", allowClear: true, showSearch: true, style: { width: '100%' }, value: draft.almacen || undefined, onChange: (val) => setDraft({ ...draft, almacen: val ?? '' }), options: listaAlmacenes.map(a => ({ value: a.codigo, label: a.nombre })), filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Tipo Documento" }), _jsx(Select, { mode: "multiple", placeholder: "Seleccionar tipo(s)", style: { width: '100%' }, value: draft.tipoDoc, onChange: (val) => setDraft({ ...draft, tipoDoc: val }), options: TIPO_DOC_OPTIONS })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "No. Cuenta" }), _jsx(Input, { placeholder: "Buscar por No. Cuenta", allowClear: true, style: { width: '100%' }, value: draft.noCuenta, onChange: (e) => setDraft({ ...draft, noCuenta: e.target.value }) })] }), _jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Space, { children: [_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Incluir existencia" }), _jsx(Switch, { checked: draft.existencia, onChange: (val) => setDraft({ ...draft, existencia: val }) })] }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }, children: [_jsx(Button, { onClick: limpiarFiltros, children: "Limpiar" }), _jsx(Button, { type: "primary", onClick: aplicarFiltros, children: "Aplicar" })] })] }));
    const ALL_COLUMN_DEFS = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 130,
            render: (f) => _jsx(Text, { children: formatDate(f) }),
        },
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 140,
            render: (doc) => _jsx(Text, { strong: true, children: doc }),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            render: (_, record) => {
                const fullText = record.articulo
                    ? `${record.codigo} - ${toTitleCase(record.articulo)}`
                    : record.codigo;
                return (_jsx(Tooltip, { title: fullText, children: _jsxs(Text, { children: [_jsx(Text, { strong: true, children: record.codigo }), record.articulo ? _jsxs(Text, { children: [" - ", toTitleCase(record.articulo)] }) : null] }) }));
            },
        },
        {
            title: 'Almacén',
            dataIndex: 'almacen',
            key: 'almacen',
            width: 150,
            render: (val) => _jsx(Text, { children: toTitleCase(val) }),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 90,
            align: 'right',
            render: (val) => (_jsx(Text, { style: { color: val < 0 ? '#f5222d' : undefined }, children: formatNumber(val) })),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Tipo Doc.',
            dataIndex: 'tipoDocumento',
            key: 'tipoDocumento',
            width: 100,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidad',
            key: 'entidad',
            width: 180,
            render: (val) => _jsx(Text, { children: toTitleCase(val) || '-' }),
        },
        {
            title: 'Referencia/Concepto',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 200,
            ellipsis: true,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Usuario',
            dataIndex: 'usuario',
            key: 'usuario',
            width: 120,
            render: (val) => {
                const display = val?.trim() || '-';
                return _jsx(Text, { children: toTitleCase(display) });
            },
        },
        {
            title: 'Costo Unitario',
            key: 'costoUnitario',
            width: 110,
            align: 'right',
            render: (_, record) => {
                const unitario = record.cantidad ? record.costo / record.cantidad : 0;
                return _jsx(Text, { children: formatCurrency(unitario) });
            },
        },
    ];
    const columns = useMemo(() => {
        const visibleSet = new Set(visibleColumnKeys);
        return ALL_COLUMN_DEFS.filter((col) => visibleSet.has(col.key));
    }, [visibleColumnKeys]);
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(Alert, { message: "Error al cargar movimientos de productos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { styles: {
                    body: { padding: 0 },
                }, className: "paces-card-erp", style: {
                    borderRadius: 8,
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: 16,
                                flexWrap: 'wrap',
                            }, children: [_jsx(Popover, { open: popoverOpen, trigger: "click", placement: "bottomRight", onOpenChange: (visible) => { if (!visible)
                                        setPopoverOpen(false); }, content: contentPopover, children: _jsx(Badge, { count: activeFilterCount, size: "small", offset: [-5, 5], children: _jsx(Button, { icon: _jsx(FilterOutlined, {}), onClick: abrirPopover, style: activeFilterCount > 0 ? { borderColor: '#556ee6', color: '#556ee6' } : undefined, children: "Filtros" }) }) }), _jsx(ColumnVisibilityToggle, { columns: ALL_COLUMNS_CONFIG, visibleKeys: visibleColumnKeys, onChange: setVisibleColumnKeys }), _jsx(Button, { type: "primary", onClick: handleGenerar, style: { minWidth: 100 }, children: "Generar" }), _jsx(Input.Search, { placeholder: "Buscar en resultados...", allowClear: true, onSearch: handleSearch, onKeyDown: (e) => {
                                        if (e.key === 'Escape') {
                                            e.target.blur();
                                            handleSearch('');
                                        }
                                    }, style: { width: 350 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { columns: columns, dataSource: datosPaginados, rowKey: (record) => `${record.documento}-${record.codigo}-${record.almacen}`, loading: loading, scroll: { x: 900 }, size: "middle", onChange: handleTableChange, pagination: {
                            current: page,
                            pageSize,
                            total: datosFiltrados.length,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, className: "paces-border-top paces-list-table", locale: {
                            emptyText: generated ? (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No se encontraron movimientos para los filtros seleccionados" }) })) : (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: 'Presione "Generar" para cargar los movimientos' }) })),
                        }, summary: generated ? () => {
                            const visibleKeys = columns.map((c) => c.key);
                            return (_jsx(Table.Summary.Row, { children: columns.map((col, idx) => {
                                    const key = col.key;
                                    if (key === 'cantidad') {
                                        return (_jsx(Table.Summary.Cell, { index: idx, align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.cantidad) }) }, key));
                                    }
                                    if (key === 'costo') {
                                        return (_jsx(Table.Summary.Cell, { index: idx, align: "right", children: _jsx(Text, { strong: true, children: formatCurrency(totales.costo) }) }, key));
                                    }
                                    if (idx === 0) {
                                        return (_jsx(Table.Summary.Cell, { index: idx, children: _jsx(Text, { strong: true, style: { fontSize: 13 }, children: "Totales" }) }, key));
                                    }
                                    return _jsx(Table.Summary.Cell, { index: idx }, key);
                                }) }));
                        } : undefined })] })] }));
};
export default MovimientosProductos;
