import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Modal, Typography, Tooltip, Alert, App, Drawer, Avatar, Skeleton, Empty, } from 'antd';
import { LockFilled, FileTextOutlined, FileSearchOutlined, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, EyeOutlined, ClockCircleOutlined, BarChartOutlined, ShopOutlined, ReloadOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
import PermissionGate from '../../components/PermissionGate';
const { Text } = Typography;
function extraerMensajeError(err, fallback) {
    const data = err?.response?.data;
    if (!data)
        return fallback;
    if (data.errorMessage)
        return data.errorMessage;
    if (data.errors && typeof data.errors === 'object') {
        const mensajes = [];
        for (const key of Object.keys(data.errors)) {
            const val = data.errors[key];
            if (Array.isArray(val))
                mensajes.push(...val);
            else if (typeof val === 'string')
                mensajes.push(val);
        }
        if (mensajes.length > 0)
            return mensajes.join('; ');
    }
    return fallback;
}
// ===== Componente principal =====
const OrdenCompraDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig();
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [tieneScan, setTieneScan] = useState(null);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = useState([]);
    const monedaDefault = getMonedaSucursalActiva();
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const { message } = App.useApp();
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    // Análisis / monitor (igual que en GeneradorORCDetalle)
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
    // ===== Carga de documentos relacionados =====
    useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id)
            .then((rel) => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
            message.warning('No se pudieron cargar los documentos relacionados');
        });
    }, [data?.id]);
    // ===== handleRefresh =====
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            setPageTitleOverride(`ORC-${res.noDocumento || id}`);
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    // ===== Handlers de acciones de estado =====
    const handleDesaplicar = async () => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `ORC-${data.noDocumento}`;
            await ordenCompraApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado exitosamente');
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAplicar = () => {
        if (!id)
            return;
        setOperacionTitulo(`Aplicando ORC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/ORC/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await ordenCompraApi.anular(sucursalActiva, data);
            message.success('Documento anulado exitosamente');
            const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handlePostear = () => {
        if (!data)
            return;
        setOperacionTitulo(`Posteando ORC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/ORC/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await ordenCompraApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al marcar revisado');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleReversar = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await ordenCompraApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al reversar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await ordenCompraApi.descargarScan(sucursalActiva, parseInt(id));
            const url = URL.createObjectURL(blob);
            setScannerUrl(url);
            setScannerModalOpen(true);
        }
        catch {
            message.error('Error al cargar el archivo escaneado');
        }
        finally {
            setScannerLoading(false);
        }
    };
    // ===== Efectos de ciclo de vida =====
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`ORC-${res.noDocumento || id}`);
            // Verificar scan
            ordenCompraApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar la orden de compra');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
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
    // ===== Early returns =====
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando orden de compra..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FORC", onRecargar: handleRefresh });
    }
    // ===== Cálculos derivados =====
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(data.periodo) === 6;
    const detallesFiltrados = detalleSearch
        ? (data.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (data.detalles || []);
    // ===== Columnas de tablas =====
    const detalleColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            onCell: () => ({ style: { verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 8 }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }, children: toTitleCase(record.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: [_jsx("span", { children: record.codigo }), record.codigo && record.referencia && _jsx("span", { children: ' | ' }), record.referencia && _jsx("span", { children: record.referencia })] }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }, children: [record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px', margin: 0 }, children: toTitleCase(record.familia.nombre) }) : null, record.fechaVencimiento && _jsxs("span", { style: { color: '#8c8c8c' }, children: ["V: ", formatDate(record.fechaVencimiento)] })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }, children: [_jsx(PermissionGate, { permisoEspecial: "pe_ver_analisis_compra", children: _jsx(EyeOutlined, { style: { cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }, onClick: (e) => {
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
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.cantidad || 0) }), record.medida?.nombre && (_jsx(Tooltip, { title: record.medida.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida.nombre }) }))] })),
        },
        {
            title: 'Costo',
            key: 'costo',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (_, record) => {
                const costoBase = Number(record.costo) || 0;
                const pctDesc = Number(record.porcentajeDescuento) || 0;
                const factor = Number(record.medida?.factor) || 1;
                const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
                const costoUnitario = costoConDescuento / factor;
                return (_jsxs("div", { children: [_jsx("div", { children: formatNumber(costoBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.subTotal || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.descuento || 0) }), record.porcentajeDescuento ? _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: ["(", formatNumber(record.porcentajeDescuento), "%)"] }) : null] })),
        },
        {
            title: 'Total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
    ];
    // asientoColumns reemplazado por AsientosContableTable compartido
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de orden de compra", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FORC", estado: data.estado, periodo: data.periodo, revisado: data.revisado, saving: saving, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onEditar: () => navigate(`/FORC/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: handleDesaplicar, onReversar: handleReversar, showImprimir: false }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), data.nota && (_jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota }) }))] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r) => r.id || r.codigo, size: "small", pagination: false, scroll: { x: 1100 } })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${data.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 700 } })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${data.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: data.suplidor, fallbackTitulo: "Suplidor" }), _jsx(TotalesCard, { subTotal: data.subTotal || 0, descuento: data.descuento || 0, impuestos: data.impuestos || 0, total: data.total || 0, alignRight: false, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), data.nota && (_jsx(Descriptions.Item, { label: "Nota", span: 1, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota }) }))] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r) => r.id || r.codigo, size: "small", pagination: false, scroll: { x: 1100 } })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data.asientos?.length || 0})`,
                                children: _jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 700 } }),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data.logs?.length || 0})`,
                                children: _jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } }),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: data.subTotal || 0, descuento: data.descuento || 0, impuestos: data.impuestos || 0, total: data.total || 0, alignRight: true, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(Drawer, { title: _jsxs(Space, { children: [_jsx(BarChartOutlined, { style: { color: 'var(--paces-primary)' } }), _jsx("span", { style: { fontWeight: 600 }, children: "An\u00E1lisis de Producto" })] }), placement: "right", width: 520, open: analisisOpen, onClose: () => setAnalisisOpen(false), children: analisisDetalle && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 0 }, children: [_jsxs(Space, { align: "start", size: 12, style: { marginBottom: 16, width: '100%' }, children: [_jsx(Avatar, { size: 40, style: { backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }, children: (analisisDetalle?.articulo || '?')[0].toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx(Typography.Title, { level: 5, style: { margin: 0 }, children: toTitleCase(analisisDetalle?.articulo || '') }), _jsxs(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 12 }, children: ["C\u00F3digo: ", analisisDetalle?.codigo, analisisDetalle?.referencia ? _jsxs("span", { children: [" \u00B7 Ref: ", analisisDetalle.referencia] }) : '', analisisDetalle?.medida?.nombre ? _jsxs("span", { children: [" \u00B7 Medida: ", analisisDetalle.medida.nombre] }) : ''] })] })] }), _jsx(Divider, { style: { margin: '0 0 16px 0' } }), analisisError ? (_jsx(Alert, { type: "error", message: "Error al cargar datos", style: { marginBottom: 16 }, action: _jsxs(Button, { size: "small", onClick: () => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }, children: [_jsx(ReloadOutlined, {}), "Reintentar"] }) })) : analisisLoading ? (_jsx(Skeleton, { active: true, paragraph: { rows: 3 }, style: { marginBottom: 16 } })) : analisisData.length > 0 ? (_jsxs(_Fragment, { children: [analisisData.some((d) => d.resumen) && (_jsxs(Card, { className: "paces-card", size: "small", style: {
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
                                    }) })] })) : (_jsx(Alert, { type: "info", message: "No se encontraron entradas para este producto", style: { marginBottom: 16 } })), _jsx(Divider, { orientation: "left", style: { fontSize: 12, color: '#8c8c8c' }, children: "Costos y Precio" }), _jsx("div", { style: { background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }, children: _jsxs(Row, { gutter: 0, children: [_jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Costo" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatNumber(analisisDetalle?.costo || 0) })] }), _jsxs(Col, { span: 8, style: { borderRight: '1px solid #f0f0f0', textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Margen %" }), _jsxs(Typography.Text, { strong: true, style: { fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }, children: [(analisisDetalle?.margen || 0).toFixed(2), "%"] })] }), _jsxs(Col, { span: 8, style: { textAlign: 'center' }, children: [_jsx(Typography.Text, { className: "paces-text-secondary", style: { fontSize: 11, display: 'block' }, children: "Precio" }), _jsx(Typography.Text, { strong: true, style: { fontSize: 16 }, children: formatNumber(analisisDetalle?.precioSugerido || 0) })] })] }) })] })) }), _jsx(ModalMovimientosPosteriores, { open: movimientosModalOpen, sucursal: movimientosSucursal, codigo: analisisDetalle?.codigo || '', dataSource: movimientosData, loading: movimientosLoading, onClose: () => setMovimientosModalOpen(false) }), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default OrdenCompraDetalle;
