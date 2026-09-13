import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Row, Col, Divider, Grid, message, Typography, Descriptions, Alert, Input, Tooltip, Space, Modal, Drawer, Avatar, Skeleton, Empty, Dropdown, } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PrinterOutlined, SearchOutlined, EyeOutlined, ClockCircleOutlined, BarChartOutlined, ShopOutlined, ReloadOutlined, DownOutlined, FilePdfOutlined, CheckCircleOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { apiClient } from '../../api/client';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ErrorDetalle } from '../../components';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import PermissionGate from '../../components/PermissionGate';
import LogTable from '../../components/LogTable';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
const { Text } = Typography;
const ESTADO_MAP = {
    0: { label: 'Borrador', color: 'default' },
    1: { label: 'Generado', color: 'success' },
    2: { label: 'Procesado', color: 'processing' },
    3: { label: 'Anulado', color: 'error' },
};
function calcularFilaGORC(fila) {
    const cantTotal = Object.values(fila.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
    const costo = fila.costo || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const pctImp = fila.impuesto?.porcentaje ?? 0;
    const subTotal = Math.round(cantTotal * costo * 100) / 100;
    const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
    const base = subTotal - descuento;
    const impuestos = Math.round(base * (pctImp / 100) * 100) / 100;
    const total = Math.round((base + impuestos) * 100) / 100;
    return { ...fila, subTotal, descuento, impuestos, total };
}
const GeneradorORCDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode } = useScreenConfig();
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [generando, setGenerando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [ordenesGeneradas, setOrdenesGeneradas] = useState([]);
    const [ordenesLoading, setOrdenesLoading] = useState(false);
    const [adpList, setAdpList] = useState([]);
    const [adpLoading, setAdpLoading] = useState(false);
    // Análisis / monitor
    const [analisisOpen, setAnalisisOpen] = useState(false);
    const [analisisDetalle, setAnalisisDetalle] = useState(null);
    const [analisisData, setAnalisisData] = useState([]);
    const [analisisLoading, setAnalisisLoading] = useState(false);
    const [analisisError, setAnalisisError] = useState(false);
    const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);
    // Modal movimientos
    const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
    const [movimientosSucursal, setMovimientosSucursal] = useState('');
    const [movimientosData, setMovimientosData] = useState([]);
    const [movimientosLoading, setMovimientosLoading] = useState(false);
    const detallesFiltrados = useMemo(() => {
        const d = (data?.detalles || []).map((item) => calcularFilaGORC(item));
        return detalleSearch
            ? d.filter(item => {
                const q = detalleSearch.toLowerCase();
                return (item.codigo || '').toLowerCase().includes(q) ||
                    (item.producto || '').toLowerCase().includes(q);
            })
            : d;
    }, [data, detalleSearch]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        generadorOrcApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`GORC-${res.numero}`);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleGenerarOC = async () => {
        if (!id)
            return;
        Modal.confirm({
            title: 'Generar Órdenes de Compra',
            content: 'Se generarán Órdenes de Compra para las sucursales con cantidad > 0. ¿Continuar?',
            onOk: async () => {
                setGenerando(true);
                try {
                    const ordenes = await generadorOrcApi.generarOC(sucursalActiva, id);
                    message.success(`Se generaron ${ordenes.length} Órdenes de Compra`);
                    handleRefresh();
                    const resumen = ordenes
                        .map((o) => `${o.documento?.codigo || 'ORC'}-${o.noDocumento}`)
                        .join(', ');
                    Modal.success({
                        title: 'Órdenes generadas',
                        content: (_jsxs("div", { children: [_jsxs("p", { children: ["Se generaron ", ordenes.length, " orden(es):"] }), _jsx("p", { children: resumen })] })),
                    });
                }
                catch (err) {
                    const msg = err?.response?.data?.errorMessage || 'Error al generar OC';
                    message.error(msg);
                }
                finally {
                    setGenerando(false);
                }
            },
        });
    };
    const handleAplicarADP = async () => {
        if (!id)
            return;
        Modal.confirm({
            title: 'Generar Actualizaciones de Precio',
            content: 'Se generarán actualizaciones de precio para las sucursales con productos que tengan cambios de precio. ¿Continuar?',
            onOk: async () => {
                setAplicando(true);
                try {
                    await apiClient.post(`/GORC/${sucursalActiva}/aplicar/${id}`);
                    message.success('Actualizaciones de precio generadas correctamente');
                    handleRefresh();
                }
                catch (err) {
                    const msg = err?.response?.data?.errorMessage || 'Error al aplicar el generador';
                    message.error(msg);
                }
                finally {
                    setAplicando(false);
                }
            },
        });
    };
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, screenCode]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        generadorOrcApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`GORC-${res.numero}`);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Efecto: cargar ORCs generadas
    useEffect(() => {
        if (!id || !data)
            return;
        setOrdenesLoading(true);
        generadorOrcApi.obtenerOrdenes(sucursalActiva, id)
            .then(setOrdenesGeneradas)
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar órdenes de compra';
            message.error(msg);
        })
            .finally(() => setOrdenesLoading(false));
    }, [id, sucursalActiva, data]);
    // Efecto: cargar ADP vinculados al GORC
    useEffect(() => {
        if (!data?.numero)
            return;
        setAdpLoading(true);
        apiClient.get(`/ADP/${sucursalActiva}/filtrar`, {
            params: { docReferencia: data.numero, cantidad: 20 }
        })
            .then((res) => setAdpList(res.data?.data || []))
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar actualizaciones de precio';
            message.error(msg);
            setAdpList([]);
        })
            .finally(() => setAdpLoading(false));
    }, [data?.numero, sucursalActiva]);
    // Efecto: cargar análisis cuando se abre el Drawer
    useEffect(() => {
        if (!analisisOpen || !analisisDetalle)
            return;
        const SUCURSALES = [
            { id: 0, nombre: 'OP' },
            { id: 1, nombre: 'HR' },
            { id: 2, nombre: 'VH' },
        ];
        setAnalisisData([]);
        setAnalisisLoading(true);
        setAnalisisError(false);
        // Fase 1: 3 llamadas paralelas (una por sucursal)
        Promise.allSettled(SUCURSALES.map((s) => entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, analisisDetalle.codigo)
            .then((data) => {
            if (data && data.length > 0) {
                const item = data[0];
                return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null, documento: '', cantidad: 0 };
        })
            .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null, documento: '', cantidad: 0
        })))).then((results) => {
            const datos = results
                .map((r) => (r.status === 'fulfilled' ? r.value : null))
                .filter((d) => d !== null);
            setAnalisisData(datos);
            setAnalisisLoading(false);
            // Fase 2: resumen movimientos para las que sí tienen fecha
            const conDatos = datos.filter((d) => d?.fecha);
            if (conDatos.length > 0) {
                setAnalisisResumenLoading(true);
                Promise.allSettled(conDatos.map((item) => entradaAlmacenApi.obtenerResumenMovimientosPosteriores(item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal)
                    .then((resumen) => ({ sucursal: item.sucursal, resumen }))
                    .catch(() => ({ sucursal: item.sucursal, resumen: null })))).then((res) => {
                    setAnalisisData((prev) => prev.map((item) => {
                        const found = res.find((r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal);
                        return found?.status === 'fulfilled' && found.value?.resumen
                            ? { ...item, resumen: found.value.resumen }
                            : item;
                    }));
                    setAnalisisResumenLoading(false);
                });
            }
        }).catch(() => {
            setAnalisisError(true);
            setAnalisisLoading(false);
        });
    }, [analisisOpen, analisisDetalle]);
    // Handler: ver movimientos en modal
    const handleVerMovimientos = useCallback(async (item) => {
        if (!analisisDetalle)
            return;
        setMovimientosSucursal(item.sucursalNombre);
        setMovimientosModalOpen(true);
        setMovimientosLoading(true);
        setMovimientosData([]);
        try {
            const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal);
            setMovimientosData(data ?? []);
        }
        catch {
            message.error('Error al cargar movimientos');
            setMovimientosData([]);
        }
        finally {
            setMovimientosLoading(false);
        }
    }, [analisisDetalle]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { mensaje: "Error al cargar el documento", rutaVolver: "/FGORC" });
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
    const detalles = detallesFiltrados;
    const sumSubTotal = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const sumDescuento = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const sumImpuestos = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const sumTotal = detalles.reduce((s, d) => s + (d.total || 0), 0);
    const SUC_BAND = {
        OP: 'gorc-band-op',
        HR: 'gorc-band-hr',
        VH: 'gorc-band-vh',
    };
    const sucursalColumns = (suc) => ({
        title: suc,
        className: SUC_BAND[suc] || '',
        children: [
            {
                title: 'Cant.',
                key: `${suc}_cant`,
                width: 90,
                align: 'right',
                onHeaderCell: () => ({ className: SUC_BAND[suc] || '' }),
                onCell: () => ({ className: `gorc-cell-${suc.toLowerCase()}`, style: { verticalAlign: 'top' } }),
                render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, children: formatNumber(record.cantidades?.[suc] ?? 0) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: '18px', textAlign: 'right' }, children: ["Conteo: ", _jsx("strong", { children: formatNumber(record.existenciasFisicas?.[suc] ?? 0) })] })] })),
            },
        ],
    });
    const detalleColumns = [
        {
            title: 'Información',
            className: 'gorc-band-info',
            fixed: 'left',
            children: [
                {
                    title: 'Artículo', key: 'producto', width: 280,
                    onCell: () => ({ style: { verticalAlign: 'top', paddingLeft: 16, whiteSpace: 'normal', wordBreak: 'break-word' } }),
                    onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
                    render: (_, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 8 }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }, children: toTitleCase(record.producto || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: [_jsx("span", { children: record.codigo }), record.codigo && record.referencia && _jsx("span", { children: ' | ' }), record.referencia && _jsx("span", { children: record.referencia })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }, children: [_jsx(PermissionGate, { permisoEspecial: "pe_ver_analisis_compra", children: _jsx(EyeOutlined, { style: { cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }, onClick: (e) => {
                                                e.stopPropagation();
                                                setAnalisisDetalle(record);
                                                setAnalisisOpen(true);
                                            } }) }), record.ultimaCompraFecha && ((() => {
                                        const diffDias = dayjs().diff(dayjs(record.ultimaCompraFecha), 'day');
                                        if (diffDias > 30) {
                                            return (_jsx(Tooltip, { title: `Última compra: ${formatDate(record.ultimaCompraFecha)} (${diffDias} días)`, children: _jsx(ClockCircleOutlined, { style: { color: '#fa8c16', cursor: 'pointer', marginTop: 2, fontSize: 14 } }) }));
                                        }
                                        return null;
                                    })())] })] })),
                },
                {
                    title: 'Medida', key: 'medida', width: 100,
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (_, record) => (_jsx("div", { style: { fontSize: 12 }, children: record.medida?.nombre || '-' })),
                },
                {
                    title: 'Costo', key: 'costo', width: 110, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (_, record) => {
                        const costoBase = Number(record.costo) || 0;
                        const pctDesc = Number(record.porcentajeDescuento) || 0;
                        const factor = Number(record.medida?.factor) || 1;
                        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
                        const costoUnitario = costoConDescuento / factor;
                        return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: formatNumber(costoBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
                    },
                },
                {
                    title: 'Margen %', dataIndex: 'margen', key: 'margen', width: 100, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (margen) => `${(margen || 0).toFixed(2)}%`,
                },
                {
                    title: 'P. Sugerido', dataIndex: 'precioSugerido', key: 'precioSugerido', width: 100, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (val) => formatNumber(val || 0),
                },
            ],
        },
        // Columnas agrupadas por sucursal (OP, HR, VH)
        sucursalColumns('OP'),
        sucursalColumns('HR'),
        sucursalColumns('VH'),
        // Totales
        {
            title: 'Totales',
            className: 'gorc-band-totales',
            children: [
                {
                    title: 'SubTotal', dataIndex: 'subTotal', key: 'subTotal', width: 110, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (val) => formatNumber(val || 0),
                },
                {
                    title: 'Descuento', key: 'descuento_comb', width: 100, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (_, record) => (_jsxs("div", { children: [_jsxs("div", { children: [(record.porcentajeDescuento || 0).toFixed(2), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: formatNumber(record.descuento || 0) })] })),
                },
                {
                    title: 'Impuesto', dataIndex: 'impuestos', key: 'impuestos', width: 140, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx(Tooltip, { title: record.impuesto.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: toTitleCase(record.impuesto.nombre) }) }))] })),
                },
                {
                    title: 'Total', dataIndex: 'total', key: 'total', width: 110, align: 'right',
                    onCell: () => ({ style: { verticalAlign: 'top' } }),
                    render: (val) => _jsx(Text, { strong: true, style: { color: 'var(--paces-primary)' }, children: formatNumber(val || 0) }),
                },
            ],
        },
    ];
    // Calcular colSpan dinámicamente: contar todas las columnas hijas excepto el grupo "Totales"
    const colsAntes = detalleColumns
        .filter((c) => c.title !== 'Totales')
        .reduce((sum, c) => sum + (c.children?.length || 1), 0);
    const datosGeneralesCard = (_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos del Generador" }), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] }), style: { marginBottom: 16 }, children: [_jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "N\u00FAmero:", children: data.numero || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: data.tipo || '—' }), _jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(data.fecha) }), _jsx(Descriptions.Item, { label: "Suplidor:", children: data.suplidor ? toTitleCase(data.suplidor.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", span: isLarge ? 2 : undefined, children: toTitleCase(data.almacen || '-') }), _jsx(Descriptions.Item, { label: "Total:", children: _jsx(Text, { strong: true, children: formatCurrency(data.total) }) }), _jsx(Descriptions.Item, { label: "Notas:", span: isLarge ? 3 : undefined, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.notas || '-' }) })] }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs(Row, { gutter: 16, children: [_jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "SubTotal" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: formatCurrency(sumSubTotal) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Descuento" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: formatCurrency(sumDescuento) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Impuestos" }), _jsx("div", { style: { fontSize: 14, fontWeight: 500 }, children: formatCurrency(sumImpuestos) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Total" }), _jsx("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--paces-primary)' }, children: formatCurrency(sumTotal) })] })] })] }));
    const detallesTabContent = isLarge ? (detalles.length > 0 ? (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "codigo", size: "small", pagination: false, scroll: { x: 1100 }, summary: () => (_jsx(Table.Summary, { fixed: "bottom", children: _jsxs(Table.Summary.Row, { style: { fontWeight: 600, backgroundColor: '#fafafa' }, children: [_jsx(Table.Summary.Cell, { index: 0, colSpan: colsAntes, children: _jsx(Text, { strong: true, style: { paddingLeft: 8 }, children: "Totales" }) }), _jsx(Table.Summary.Cell, { index: colsAntes, align: "right", children: formatNumber(sumSubTotal) }), _jsx(Table.Summary.Cell, { index: colsAntes + 1, align: "right", children: formatNumber(sumDescuento) }), _jsx(Table.Summary.Cell, { index: colsAntes + 2, align: "right", children: formatNumber(sumImpuestos) }), _jsx(Table.Summary.Cell, { index: colsAntes + 3, align: "right", children: _jsx(Text, { strong: true, style: { color: 'var(--paces-primary)' }, children: formatNumber(sumTotal) }) })] }) })) })) : (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx("div", { className: "paces-text-secondary", children: "No hay productos en este generador" }) }))) : (
    // Mobile: tarjetas de producto individuales
    detalles.length > 0 ? (_jsx("div", { children: detalles.map((item) => (_jsxs(Card, { size: "small", style: { marginBottom: 8 }, className: "paces-card", children: [_jsx("div", { style: { fontWeight: 500, fontSize: 14 }, children: toTitleCase(item.producto || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 12, marginBottom: 8 }, children: [item.codigo, item.referencia ? ` | ${item.referencia}` : ''] }), _jsxs(Row, { gutter: 8, children: [_jsxs(Col, { span: 8, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Costo" }), _jsx("div", { children: formatNumber(item.costo || 0) })] }), _jsxs(Col, { span: 8, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Margen %" }), _jsxs("div", { children: [(item.margen || 0).toFixed(2), "%"] })] }), _jsxs(Col, { span: 8, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "P. Sugerido" }), _jsx("div", { children: formatNumber(item.precioSugerido || 0) })] })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsx(Row, { gutter: 8, children: ['OP', 'HR', 'VH'].map((suc) => (_jsxs(Col, { span: 8, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 12, marginBottom: 4 }, children: suc }), _jsxs("div", { style: { fontSize: 11 }, children: [_jsxs("div", { children: ["C: ", formatNumber(item.cantidades?.[suc] ?? 0)] }), _jsxs("div", { className: "paces-text-secondary", children: ["Conteo: ", formatNumber(item.existenciasFisicas?.[suc] ?? 0)] })] })] }, suc))) }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs(Row, { gutter: 8, children: [_jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "SubTotal" }), _jsx("div", { children: formatNumber(item.subTotal || 0) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Descuento" }), _jsx("div", { children: formatNumber(item.descuento || 0) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Impuesto" }), _jsx("div", { children: formatNumber(item.impuestos || 0) })] }), _jsxs(Col, { span: 6, children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Total" }), _jsx("div", { style: { fontWeight: 700, color: 'var(--paces-primary)' }, children: formatNumber(item.total || 0) })] })] })] }, item.codigo))) })) : (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx("div", { className: "paces-text-secondary", children: "No hay productos en este generador" }) })));
    const orcColumns = [
        { title: 'Documento', dataIndex: 'noDocumento', key: 'noDocumento', width: 160,
            render: (doc, record) => (_jsx(Link, { to: `/FORC/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
        },
        { title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fechaDocumento', width: 110,
            render: (f) => formatDate(f),
        },
        { title: 'Suplidor', key: 'suplidor', render: (_, r) => r.suplidor?.nombre || '-' },
        { title: 'Concepto', key: 'concepto', render: (_, r) => r.concepto?.nombre || '-' },
        { title: 'Total', dataIndex: 'total', key: 'total', width: 130, align: 'right',
            render: (t) => _jsx(Text, { strong: true, children: formatNumber(t) }),
        },
        { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 110,
            render: (estado) => {
                const estadoNum = typeof estado === 'string'
                    ? { Borrador: 0, Validado: 1, Anulado: 3 }[estado] ?? -1
                    : estado;
                const info = estadoNum === 0 ? { label: 'Borrador', color: 'default' }
                    : estadoNum === 1 ? { label: 'Aplicado', color: 'success' }
                        : estadoNum === 3 ? { label: 'Anulado', color: 'error' }
                            : { label: 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
    ];
    const tabsItems = [
        {
            key: 'detalles',
            label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
            children: detallesTabContent,
        },
        {
            key: 'ordenes',
            label: `Órdenes de compra (${ordenesGeneradas.length})`,
            children: (_jsx(Table, { dataSource: ordenesGeneradas, columns: orcColumns, rowKey: "id", size: "small", pagination: false, loading: ordenesLoading, scroll: { x: 800 }, locale: { emptyText: _jsx(Empty, { description: "No hay \u00F3rdenes de compra generadas" }) } })),
        },
        {
            key: 'historial',
            label: `Historial (${data.logs?.length || 0})`,
            children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 800 } })),
        },
        {
            key: 'adp',
            label: `Actualizaciones de Precio (${adpList.length})`,
            children: (_jsx(Table, { dataSource: adpList, rowKey: "idExterno", size: "small", pagination: false, loading: adpLoading, scroll: { x: 800 }, columns: [
                    { title: 'Tipo', key: 'tipo', width: 90,
                        render: (_, record) => {
                            const esN = (record.idExterno || record.documento || '').endsWith('N');
                            return _jsx(Tag, { color: esN ? 'red' : 'green', children: esN ? 'Bajada' : 'Subida' });
                        },
                    },
                    { title: 'Documento', dataIndex: 'documento', width: 160 },
                    { title: 'Fecha', dataIndex: 'fecha', width: 120, render: (v) => formatDate(v) },
                    { title: 'Estado', dataIndex: 'estado', width: 100 },
                ], locale: { emptyText: _jsx(Empty, { description: "No hay actualizaciones de precio" }) } })),
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle del generador ORC", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(-1), children: "Volver" }), _jsx(SucursalDocumentoSelector, { value: sucursalDestino, onChange: setSucursalDestino }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "IMPRIMIR", children: _jsx(Dropdown, { menu: {
                                items: [
                                    {
                                        key: 'generador',
                                        icon: _jsx(FilePdfOutlined, {}),
                                        label: 'Generador ORC',
                                        onClick: async () => {
                                            try {
                                                const res = await apiClient.get(`/ReporteGeneradorOrdenCompra/${sucursalActiva}/${id}`, {
                                                    responseType: 'blob',
                                                });
                                                const url = URL.createObjectURL(res.data);
                                                window.open(url, '_blank');
                                            }
                                            catch {
                                                message.error('Error al generar el reporte');
                                            }
                                        },
                                    },
                                    {
                                        key: 'externas',
                                        icon: _jsx(FilePdfOutlined, {}),
                                        label: 'Ordenes Externas',
                                        onClick: async () => {
                                            try {
                                                const res = await apiClient.get(`/ReporteOrdenCompra/${sucursalActiva}/${id}?tipo=externo`, {
                                                    responseType: 'blob',
                                                });
                                                const url = URL.createObjectURL(res.data);
                                                window.open(url, '_blank');
                                            }
                                            catch {
                                                message.error('Error al generar el reporte');
                                            }
                                        },
                                    },
                                    {
                                        key: 'internas',
                                        icon: _jsx(FilePdfOutlined, {}),
                                        label: 'Ordenes Internas',
                                        onClick: async () => {
                                            try {
                                                const res = await apiClient.get(`/ReporteOrdenCompra/${sucursalActiva}/${id}?tipo=interno`, {
                                                    responseType: 'blob',
                                                });
                                                const url = URL.createObjectURL(res.data);
                                                window.open(url, '_blank');
                                            }
                                            catch {
                                                message.error('Error al generar el reporte');
                                            }
                                        },
                                    },
                                ],
                            }, children: _jsxs(Button, { icon: _jsx(PrinterOutlined, {}), children: ["Imprimir ", _jsx(DownOutlined, {})] }) }) }), _jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: () => navigate(`/FGORC/${id}/editar`), children: "Editar" }) }), data.estado === 0 && (_jsx(PermissionGate, { accion: "APLICAR", children: _jsx(Button, { style: { background: '#389e0d', borderColor: '#389e0d', color: '#fff' }, icon: _jsx(CheckCircleOutlined, {}), onClick: handleAplicarADP, loading: aplicando, children: "Aplicar" }) })), (data.estado === 0 || data.estado === 1) && (_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(ShopOutlined, {}), onClick: handleGenerarOC, loading: generando, children: "Generar OC" }) }))] }), isLarge ? (_jsxs("div", { children: [datosGeneralesCard, _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar producto...", allowClear: true, style: { width: 320 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: tabsItems })] })) : (_jsxs("div", { children: [datosGeneralesCard, _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar producto...", allowClear: true, style: { width: 320 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: tabsItems })] })), _jsx(Drawer, { title: _jsxs(Space, { children: [_jsx(BarChartOutlined, { style: { color: 'var(--paces-primary)' } }), _jsx("span", { style: { fontWeight: 600 }, children: "An\u00E1lisis de Producto" })] }), placement: "right", width: 520, open: analisisOpen, onClose: () => setAnalisisOpen(false), children: analisisDetalle && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 0 }, children: [_jsxs(Space, { align: "start", size: 12, style: { marginBottom: 16, width: '100%' }, children: [_jsx(Avatar, { size: 40, style: { backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }, children: (analisisDetalle?.producto || '?')[0].toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: toTitleCase(analisisDetalle?.producto || '') }), _jsxs(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: ["C\u00F3digo: ", analisisDetalle?.codigo, analisisDetalle?.referencia ? _jsxs("span", { children: [" \u00B7 Ref: ", analisisDetalle.referencia] }) : '', analisisDetalle?.medida?.nombre ? _jsxs("span", { children: [" \u00B7 Medida: ", analisisDetalle.medida.nombre] }) : ''] })] })] }), _jsx(Divider, { style: { margin: '0 0 16px 0' } }), analisisError ? (_jsx(Alert, { type: "error", message: "Error al cargar datos", style: { marginBottom: 16 }, action: _jsxs(Button, { size: "small", onClick: () => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }, children: [_jsx(ReloadOutlined, {}), "Reintentar"] }) })) : analisisLoading ? (_jsx(Skeleton, { active: true, paragraph: { rows: 3 }, style: { marginBottom: 16 } })) : analisisData.length > 0 ? (_jsxs(_Fragment, { children: [analisisData.some((d) => d.resumen) && (_jsxs(Card, { className: "paces-card", size: "small", style: {
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                        borderTop: '3px solid #556ee6',
                                        background: 'rgba(85,110,230,0.04)',
                                        marginBottom: 12,
                                    }, children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }, children: "\uD83D\uDCCA Resumen total" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }, children: (() => {
                                                const totales = analisisData.reduce((acc, item) => {
                                                    const r = item.resumen;
                                                    if (!r)
                                                        return acc;
                                                    return {
                                                        ventasSinComponentes: acc.ventasSinComponentes + (r.ventasSinComponentes || 0),
                                                        ventasConComponentes: acc.ventasConComponentes + (r.ventasConComponentes || 0),
                                                        salidas: acc.salidas + (r.salidas || 0),
                                                        devCompra: acc.devCompra + (r.devolucionesCompra || 0),
                                                        devVenta: acc.devVenta + (r.devolucionesVenta || 0),
                                                    };
                                                }, { ventasSinComponentes: 0, ventasConComponentes: 0, salidas: 0, devCompra: 0, devVenta: 0 });
                                                return [
                                                    { label: 'Ventas (sin comp.)', value: totales.ventasSinComponentes },
                                                    { label: 'Ventas (con comp.)', value: totales.ventasConComponentes },
                                                    { label: 'Salidas', value: totales.salidas },
                                                    { label: 'Dev. Compra', value: totales.devCompra },
                                                    { label: 'Dev. Venta', value: totales.devVenta },
                                                ].map((kpi) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c' }, children: kpi.label }), _jsx(Typography.Text, { strong: true, style: { fontSize: 14, color: '#556ee6' }, children: formatNumber(kpi.value) })] }, kpi.label)));
                                            })() })] })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: analisisData.map((item) => {
                                        const SUCURSAL_COLORS = {
                                            0: { color: '#1677ff', bg: 'rgba(22,119,255,0.06)' },
                                            1: { color: '#52c41a', bg: 'rgba(82,196,26,0.06)' },
                                            2: { color: '#fa8c16', bg: 'rgba(250,140,22,0.06)' },
                                        };
                                        const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6', bg: 'rgba(85,110,230,0.06)' };
                                        const sinRegistro = !item.fecha;
                                        return (_jsxs(Card, { className: "paces-card", size: "small", style: {
                                                borderRadius: 6,
                                                border: '1px solid #f0f0f0',
                                                borderTop: `3px solid ${style.color}`,
                                                background: style.bg,
                                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs(Space, { children: [_jsx(ShopOutlined, { style: { color: style.color, fontSize: 15 } }), _jsx(Typography.Text, { strong: true, style: { fontSize: 13, color: style.color }, children: item.sucursalNombre }), sinRegistro && _jsx(Tag, { color: "default", style: { margin: 0, fontSize: 10 }, children: "Sin compras" })] }), !sinRegistro && (_jsx(Button, { type: "link", size: "small", icon: _jsx(EyeOutlined, {}), onClick: () => handleVerMovimientos(item), style: { fontSize: 12 }, children: "Ver movimientos \u2192" }))] }), !sinRegistro ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 10 }, children: [_jsxs(Typography.Text, { strong: true, style: { fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }, children: ["\uD83D\uDCE6 \u00DAltima compra  ", _jsx(Typography.Text, { strong: true, style: { fontSize: 13, color: '#556ee6' }, children: item.fecha ? formatDate(item.fecha) : '-' })] }), _jsxs("div", { style: { marginTop: 8 }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c', marginRight: 8 }, children: item.documento }), _jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: formatNumber(item.cantidad) })] })] }), _jsx("div", { style: { borderTop: '1px dashed #e8e8e8', marginBottom: 10 } }), _jsxs("div", { style: { marginBottom: 10 }, children: [_jsx(Typography.Text, { strong: true, style: { fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }, children: "\uD83D\uDCCA Movimientos posteriores" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 6 }, children: [
                                                                        { label: 'Ventas (sin comp.)', value: item.resumen?.ventasSinComponentes },
                                                                        { label: 'Ventas (con comp.)', value: item.resumen?.ventasConComponentes },
                                                                        { label: 'Salidas', value: item.resumen?.salidas },
                                                                        { label: 'Dev. Compra', value: item.resumen?.devolucionesCompra },
                                                                        { label: 'Dev. Venta', value: item.resumen?.devolucionesVenta },
                                                                    ].map((kpi) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }, children: [_jsx(Typography.Text, { style: { fontSize: 12, color: '#8c8c8c' }, children: kpi.label }), kpi.value !== undefined ? (_jsx(Typography.Text, { strong: true, style: { fontSize: 14, color: style.color }, children: formatNumber(kpi.value) })) : analisisResumenLoading ? (_jsx(Skeleton.Input, { active: true, size: "small", style: { width: 30, height: 16 } })) : (_jsx(Typography.Text, { style: { fontSize: 13 }, children: "0" }))] }, kpi.label))) }), item.resumen?.ultimaVentaFecha && (_jsxs("div", { style: { background: 'rgba(85,110,230,0.04)', borderRadius: 4, padding: '6px 8px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs(Typography.Text, { style: { fontSize: 11, color: '#595959' }, children: ["\uD83D\uDD50 \u00DAltima venta: ", formatDate(item.resumen.ultimaVentaFecha)] }), _jsx(Typography.Text, { style: { fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }, children: (() => {
                                                                                const diffDias = dayjs(item.resumen.ultimaVentaFecha).diff(dayjs(item.fecha), 'day');
                                                                                if (diffDias === 0)
                                                                                    return 'hoy';
                                                                                if (diffDias === 1)
                                                                                    return 'hace 1 día';
                                                                                if (diffDias < 30)
                                                                                    return `hace ${diffDias} días`;
                                                                                const diffMeses = Math.floor(diffDias / 30);
                                                                                if (diffMeses === 1)
                                                                                    return 'hace 1 mes';
                                                                                if (diffMeses < 12)
                                                                                    return `hace ${diffMeses} meses`;
                                                                                const diffAnios = Math.floor(diffDias / 365);
                                                                                if (diffAnios === 1)
                                                                                    return 'hace 1 año';
                                                                                return `hace ${diffAnios} años`;
                                                                            })() })] }))] })] })) : (_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12, fontStyle: 'italic' }, children: "No hay registros de compra para esta sucursal." }))] }, item.sucursal));
                                    }) })] })) : (_jsx(Alert, { type: "info", message: "No se encontraron entradas para este producto", style: { marginBottom: 16 } })), _jsx(Divider, { orientation: "left", style: { fontSize: 12, color: '#8c8c8c' }, children: "Costos y Precio" }), _jsx("div", { style: { background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }, children: _jsxs(Row, { gutter: 0, children: [_jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Costo" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatNumber(analisisDetalle?.costo || 0) })] }), _jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Margen %" }), _jsxs(Typography.Text, { strong: true, style: { fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }, children: [(analisisDetalle?.margen || 0).toFixed(2), "%"] })] }), _jsxs(Col, { span: 8, style: { textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Precio" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16 }, children: formatNumber(analisisDetalle?.precioSugerido || 0) })] })] }) })] })) }), _jsx(ModalMovimientosPosteriores, { open: movimientosModalOpen, sucursal: movimientosSucursal, codigo: analisisDetalle?.codigo || '', dataSource: movimientosData, loading: movimientosLoading, onClose: () => setMovimientosModalOpen(false) })] }));
};
export default GeneradorORCDetalle;
