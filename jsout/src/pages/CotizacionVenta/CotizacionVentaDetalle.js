import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Modal, Tooltip, Alert, App } from 'antd';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { cotizacionVentaApi } from '../../api/cotizacionVentaApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
const CotizacionVentaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig('FCotizacion');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [tieneScan, setTieneScan] = useState(null);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = useState([]);
    // ═══ Carga progresiva: banderas anti doble fetch por sección ═══
    const [detallesCargados, setDetallesCargados] = useState(false);
    const [asientosCargados, setAsientosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const detallesCargadosRef = useRef(false);
    const asientosCargadosRef = useRef(false);
    const monedaDefault = getMonedaSucursalActiva();
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    // Cargar documentos relacionados desde DOCUMENTOS_RELACION
    useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
            message.warning('No se pudieron cargar los documentos relacionados');
        });
    }, [data?.id]);
    const marcarSeccionesCompletas = useCallback(() => {
        setDetallesCargados(true);
        setAsientosCargados(true);
    }, []);
    // ═══════════════════════════════════════════════════════════════
    // Carga progresiva: encabezado primero + secciones críticas
    // ═══════════════════════════════════════════════════════════════
    const cargarEncabezado = useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await cotizacionVentaApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Verificar scanner
            cotizacionVentaApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [id, sucursalActiva, setPageTitleOverride]);
    const cargarSeccion = useCallback(async (seccion) => {
        if (!id)
            return;
        // Guard anti doble fetch ANTES de cualquier setState
        if ((seccion === 'detalles' && detallesCargadosRef.current) ||
            (seccion === 'asientos' && asientosCargadosRef.current)) {
            return;
        }
        setSeccionesCargando(prev => new Set(prev).add(seccion));
        try {
            const suc = sucursalActiva;
            const numId = parseInt(id);
            switch (seccion) {
                case 'detalles': {
                    const detalles = await cotizacionVentaApi.obtenerDetalles(suc, numId);
                    setData(prev => (prev ? { ...prev, detalles } : prev));
                    setDetallesCargados(true);
                    break;
                }
                case 'asientos': {
                    const asientos = await cotizacionVentaApi.obtenerAsientos(suc, numId);
                    setData(prev => (prev ? { ...prev, asientos } : prev));
                    setAsientosCargados(true);
                    break;
                }
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, `Error al cargar ${seccion}`);
            message.error(msg);
        }
        finally {
            setSeccionesCargando(prev => {
                const next = new Set(prev);
                next.delete(seccion);
                return next;
            });
        }
    }, [id, sucursalActiva]);
    // Montaje: encabezado primero, luego secciones críticas. Ant Design no dispara
    // onChange con defaultActiveKey, por eso la pestaña por defecto se carga aquí.
    useEffect(() => {
        const init = async () => {
            await cargarEncabezado();
            await Promise.all([
                cargarSeccion('detalles'),
                cargarSeccion('asientos'),
            ]);
        };
        init();
    }, [cargarEncabezado, cargarSeccion]);
    // Sincronizar refs de banderas para evitar stale closures en cargarSeccion
    useEffect(() => { detallesCargadosRef.current = detallesCargados; }, [detallesCargados]);
    useEffect(() => { asientosCargadosRef.current = asientosCargados; }, [asientosCargados]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            cotizacionVentaApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride, marcarSeccionesCompletas]);
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? (data?.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (data?.detalles || []);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FVEN", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(data.periodo) === 6;
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
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: [record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null, record.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(record.fechaVencimiento)] })] })] })),
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
            title: 'Precio',
            key: 'precio',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (_, record) => {
                const precioBase = Number(record.precio) || 0;
                const pctDesc = Number(record.porcentajeDescuento) || 0;
                const factor = Number(record.medida?.factor) || 1;
                const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
                const precioUnitario = precioConDescuento / factor;
                return (_jsxs("div", { children: [_jsx("div", { children: formatNumber(precioBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsxs("div", { children: [formatNumber(record.porcentajeDescuento || 0), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: formatNumber(record.descuento || 0) })] })),
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
            title: 'Impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx(Tooltip, { title: record.impuesto.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: toTitleCase(record.impuesto.nombre) }) }))] })),
        },
        {
            title: 'Total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx("strong", { children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
    ];
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await cotizacionVentaApi.descargarScan(sucursalActiva, parseInt(id));
            const url = URL.createObjectURL(blob);
            setScannerUrl(url);
            setScannerModalOpen(true);
        }
        catch (err) {
            message.error('Error al cargar el archivo escaneado');
        }
        finally {
            setScannerLoading(false);
        }
    };
    const handleDesaplicar = async () => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const origen = obtenerNombreEnumSucursal(String(sucursalActiva));
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await cotizacionVentaApi.desaplicar(origen, documento);
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
        setOperacionTitulo(`Aplicando COT-${data?.noDocumento || id}`);
        operacion.ejecutar(`/COTV/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await cotizacionVentaApi.anular(sucursalActiva, data.id);
            message.success('Documento anulado exitosamente');
            const res = await cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
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
        setOperacionTitulo(`Posteando COT-${data?.noDocumento || id}`);
        operacion.ejecutar(`/COTV/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await cotizacionVentaApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await cotizacionVentaApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await cotizacionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
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
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de cotizaci\u00F3n de venta", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FCotizacion", estado: data.estado, periodo: data.periodo, revisado: data.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate('/FCotizacion'), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        const res = await apiClient.post('/reportes/facturacion/cotizacion-venta', data, {
                            responseType: 'blob',
                        });
                        const blobUrl = URL.createObjectURL(res.data);
                        window.open(blobUrl, '_blank');
                    }
                    catch {
                        message.error('Error al generar el PDF');
                    }
                    finally {
                        setImprimiendo(false);
                    }
                }, onEditar: () => navigate(`/FCotizacion/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: handleDesaplicar, onReversar: handleReversar }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver cotizaci\u00F3n escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "NCF", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Almacen", span: 1, children: data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Creado Por", span: 1, children: data.usuario?.nombre || data.creadoPor || '-' }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: data.nota ? _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota }) : '-' })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                                    if (key === 'detalles')
                                        cargarSeccion('detalles');
                                    if (key === 'asientos')
                                        cargarSeccion('asientos');
                                }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${data.asientos?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: data.asientos && data.asientos.length > 0 ? (_jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })) : (_jsx("div", { style: { textAlign: 'center', padding: 24 }, className: "paces-text-secondary", children: "Sin asientos contables" })) }) })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${data.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: data.entidad, fallbackTitulo: "Cliente" }), _jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: false, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver cotizaci\u00F3n escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "NCF", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Almacen", children: data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Creado Por", children: data.usuario?.nombre || data.creadoPor || '-' }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                            if (key === 'detalles')
                                cargarSeccion('detalles');
                            if (key === 'asientos')
                                cargarSeccion('asientos');
                        }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data.asientos?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: data.asientos && data.asientos.length > 0 ? (_jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })) : (_jsx("div", { style: { textAlign: 'center', padding: 24 }, className: "paces-text-secondary", children: "Sin asientos contables" })) }) })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: true, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Cotizaci\u00F3n Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default CotizacionVentaDetalle;
