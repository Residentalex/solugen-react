import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Modal, Typography, Tooltip, Alert, App, DatePicker } from 'antd';
import dayjs from 'dayjs';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, RollbackOutlined, ArrowRightOutlined, CalendarOutlined, TagOutlined, UserOutlined, DollarOutlined, TeamOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatCurrency, formatNumber, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import SucursalField from '../../components/SucursalField';
const { Text } = Typography;
const DETALLE_COLUMNS_CONFIG = [
    { key: 'codigo', label: 'Código', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'precio', label: 'Precio', defaultVisible: true },
    { key: 'descuento', label: 'Descuento', defaultVisible: true },
    { key: 'subTotal', label: 'SubTotal', defaultVisible: false },
    { key: 'impuestos', label: 'Impuestos', defaultVisible: true },
    { key: 'total', label: 'Total', defaultVisible: true },
    { key: 'factor', label: 'Factor', defaultVisible: false },
];
const DETALLE_DEFAULT_VISIBLE_KEYS = DETALLE_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_DETALLE_VISIBLE_COLUMNS_KEY = 'dev_detalle_visibleColumns';
const DevolucionVentaDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig();
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
    const [facturaData, setFacturaData] = useState(null);
    // ═══ Carga progresiva: banderas anti doble fetch por sección ═══
    const [detallesCargados, setDetallesCargados] = useState(false);
    const [asientosCargados, setAsientosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const detallesCargadosRef = useRef(false);
    const asientosCargadosRef = useRef(false);
    const monedaDefault = getMonedaSucursalActiva();
    const [modalNDOpen, setModalNDOpen] = useState(false);
    const [generandoND, setGenerandoND] = useState(false);
    const [fechaND, setFechaND] = useState(dayjs().format('YYYY-MM-DDTHH:mm:ss'));
    const [visibleDetalleKeys, setVisibleDetalleKeys] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_DETALLE_VISIBLE_COLUMNS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0)
                    return parsed;
            }
        }
        catch { /* ignorar */ }
        return DETALLE_DEFAULT_VISIBLE_KEYS;
    });
    useEffect(() => {
        try {
            localStorage.setItem(LS_DETALLE_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleDetalleKeys));
        }
        catch { /* ignorar */ }
    }, [visibleDetalleKeys]);
    const { message: messageApi } = App.useApp();
    const fechasCierre = useCompanyStore((s) => s.data.fechasCierre);
    const fechasCierreInv = useCompanyStore((s) => s.data.fechasCierreInv);
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const screens = Grid.useBreakpoint();
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    // ===== Cargar documentos relacionados desde DOCUMENTOS_RELACION =====
    useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
        });
    }, [data?.id]);
    const marcarSeccionesCompletas = React.useCallback(() => {
        setDetallesCargados(true);
        setAsientosCargados(true);
    }, []);
    // ═══════════════════════════════════════════════════════════════
    // Carga progresiva: encabezado primero + secciones críticas
    // ═══════════════════════════════════════════════════════════════
    const cargarEncabezado = React.useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        setFacturaData(null);
        try {
            const res = await devolucionVentaApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                messageApi.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(prev => ({
                ...(prev ?? {}),
                ...res,
                detalles: prev?.detalles?.length ? prev.detalles : res.detalles,
                asientos: prev?.asientos?.length ? prev.asientos : res.asientos,
            }));
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Verificar factura escaneada
            devolucionVentaApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar factura POS asociada
            if (res.factura?.id) {
                setFacturaData(res.factura);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            messageApi.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [id, sucursalActiva, setPageTitleOverride]);
    const cargarSeccion = React.useCallback(async (seccion) => {
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
                    const detalles = await devolucionVentaApi.obtenerDetalles(suc, numId);
                    setData(prev => (prev ? { ...prev, detalles } : prev));
                    setDetallesCargados(true);
                    break;
                }
                case 'asientos': {
                    const asientos = await devolucionVentaApi.obtenerAsientos(suc, numId);
                    setData(prev => (prev ? { ...prev, asientos } : prev));
                    setAsientosCargados(true);
                    break;
                }
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, `Error al cargar ${seccion}`);
            messageApi.error(msg);
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
        detallesCargadosRef.current = false;
        asientosCargadosRef.current = false;
        const init = async () => {
            await cargarEncabezado();
            await Promise.all([
                cargarSeccion('detalles'),
                cargarSeccion('asientos'),
            ]);
        };
        init();
        return () => {
            detallesCargadosRef.current = false;
            asientosCargadosRef.current = false;
        };
    }, [cargarEncabezado, cargarSeccion]);
    // Sincronizar refs de banderas para evitar stale closures en cargarSeccion
    useEffect(() => { detallesCargadosRef.current = detallesCargados; }, [detallesCargados]);
    useEffect(() => { asientosCargadosRef.current = asientosCargados; }, [asientosCargados]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setFacturaData(null);
        setLoadingError(false);
        devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                messageApi.error('Documento no encontrado en la sucursal seleccionada.');
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
            // Verificar factura escaneada
            devolucionVentaApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar factura POS asociada
            if (res.factura?.id) {
                setFacturaData(res.factura);
            }
            else {
                setFacturaData(null);
            }
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            messageApi.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride, marcarSeccionesCompletas]);
    const handleGenerarND = useCallback(() => {
        if (!data?.id)
            return;
        setFechaND(dayjs().format('YYYY-MM-DDTHH:mm:ss'));
        setModalNDOpen(true);
    }, [data]);
    const handleConfirmarGenerarND = useCallback(async () => {
        if (!data?.id)
            return;
        setGenerandoND(true);
        try {
            const nd = await devolucionVentaApi.generarND(sucursalActiva, [data.id], fechaND);
            messageApi.success(`Nota de Débito ${nd.noDocumento} generada exitosamente`);
            setModalNDOpen(false);
            navigate(`/FNDCLI/${nd.id}`);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al generar la Nota de Débito';
            messageApi.error(msg);
        }
        finally {
            setGenerandoND(false);
        }
    }, [data, sucursalActiva, navigate, fechaND]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await devolucionVentaApi.descargarScan(sucursalActiva, parseInt(id));
            const url = URL.createObjectURL(blob);
            setScannerUrl(url);
            setScannerModalOpen(true);
        }
        catch (err) {
            messageApi.error('Error al cargar el archivo escaneado');
        }
        finally {
            setScannerLoading(false);
        }
    };
    // ===== Permisos para pantallas relacionadas =====
    const tienePermisoFPV = React.useMemo(() => {
        const usuario = useAuthStore.getState().usuario;
        if (!usuario)
            return false;
        const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === 'FPV');
        return pantalla?.acciones.includes('VISUALIZAR') ?? false;
    }, []);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FDEV", onRecargar: handleRefresh });
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(data.estado);
    const esCerrado = toPeriodoNum(data.periodo) === 6;
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? (data?.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (data?.detalles || []);
    const detalleColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 100,
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
            key: 'cantidad',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600 }, children: formatNumber(record.cantidad || 0) }), record.medida?.nombre && (_jsx(Tooltip, { title: record.medida.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida.nombre }) }))] })),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (_, record) => {
                const pctDesc = Number(record.porcentajeDescuento) || 0;
                const factor = Number(record.medida?.factor) || 1;
                const precioBase = Number(record.precio) || 0;
                const precioConDescuento = precioBase - ((precioBase * pctDesc) / 100);
                const precioUnitario = precioConDescuento / factor;
                return (_jsxs("div", { children: [_jsx("div", { children: formatNumber(precioBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(precioUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsxs("div", { children: [formatNumber(record.porcentajeDescuento || 0), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: formatNumber(record.descuento || 0) })] })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 110,
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
            dataIndex: 'total',
            key: 'total',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
        {
            title: 'Factor',
            dataIndex: 'medida.factor',
            key: 'factor',
            width: 80,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx("div", { children: formatNumber(record.medida?.factor || 1) })),
        },
    ];
    const detalleColumnsFiltered = detalleColumns.filter((col) => col.key === 'codigo' || visibleDetalleKeys.includes(col.key));
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleDesaplicar = async () => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await devolucionVentaApi.desaplicar(sucursalActiva, documento);
            messageApi.success('Documento desaplicado exitosamente');
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAplicar = () => {
        if (!id)
            return;
        setOperacionTitulo(`Aplicando DEV-${data?.noDocumento || id}`);
        operacion.ejecutar(`/DEV/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await devolucionVentaApi.anular(sucursalActiva, data);
            messageApi.success('Documento anulado exitosamente');
            const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handlePostear = () => {
        if (!data)
            return;
        setOperacionTitulo(`Posteando DEV-${data?.noDocumento || id}`);
        operacion.ejecutar(`/DEV/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await devolucionVentaApi.revisado(sucursalActiva, parseInt(id));
            messageApi.success('Documento marcado como revisado');
            const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al marcar revisado');
            messageApi.error(msg);
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
            await devolucionVentaApi.reversar(sucursalActiva, parseInt(id));
            messageApi.success('Documento reversado exitosamente');
            const res = await devolucionVentaApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al reversar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de devoluci\u00F3n de venta", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FDEV", estado: data.estado, periodo: data.periodo, revisado: data.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('DEV', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            messageApi.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const res = await apiClient.get('/reportes/facturacion/devolucion', {
                            responseType: 'blob',
                        });
                        const blobUrl = URL.createObjectURL(res.data);
                        window.open(blobUrl, '_blank');
                    }
                    catch {
                        messageApi.error('Error al generar el PDF');
                    }
                    finally {
                        setImprimiendo(false);
                    }
                }, onEditar: () => navigate(`/FDEV/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: handleDesaplicar, onReversar: handleReversar, extraButtons: (data?.transaccionesAsociadas?.length ?? 0) === 0 &&
                    (toEstadoNum(data.estado) === 1 || toEstadoNum(data.estado) === 2) ? (_jsx(PermissionGate, { permisoEspecial: "pe_generar_ndcli", children: _jsx(Button, { type: "primary", icon: _jsx(FileTextOutlined, {}), onClick: handleGenerarND, children: "Generar ND" }) })) : undefined }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Factura Ref.:", children: data.factura?.documento?.codigo ? `${data.factura.documento.codigo}-${data.factura.noDocumento}` : '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : toTitleCase(data.concepto?.nombre || '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: data.tipo?.codigo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(data.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Cliente:", children: toTitleCase(data.cliente?.nombre || data.entidad?.nombre || '-') }), _jsx(Descriptions.Item, { label: "NCF:", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Fecha Factura:", children: data.factura?.fechaDocumento ? formatDate(data.factura.fechaDocumento) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: toTitleCase(data.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                                    // Secciones perezosas bajo demanda con guards anti doble fetch
                                    if (key === 'detalles')
                                        cargarSeccion('detalles');
                                    if (key === 'asientos')
                                        cargarSeccion('asientos');
                                }, tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1200 } }) }) })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${data.asientos?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 900 } }) }) })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${data.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                                    },
                                    {
                                        key: 'consumo',
                                        label: `Consumido en (${data.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: data.transaccionesAsociadas || [], onDocumentoClick: (doc) => {
                                                const docStr = doc.documento || '';
                                                const tipo = (docStr.split('-')[0] || '').toUpperCase();
                                                const rutas = { PV: '/FPV', DEV: '/FDEV', NC: '/FNC', ND: '/FND' };
                                                const ruta = rutas[tipo];
                                                if (ruta && doc.id)
                                                    navigate(`${ruta}/${doc.id}`);
                                            } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: data.cliente, entidadSecundaria: data.entidad, fallbackTitulo: "Cliente" }), _jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: false, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), facturaData && (_jsxs(Card, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Factura Asociada" }), facturaData.documento?.codigo && (_jsx(Tag, { color: "blue", style: { marginLeft: 8, fontWeight: 400 }, children: facturaData.documento.codigo === 'PV' ? 'Punto de Venta' : facturaData.documento.codigo }))] }), className: "paces-card", style: { marginBottom: 16 }, children: [_jsxs("div", { onClick: tienePermisoFPV ? () => navigate(`/FPV/${facturaData.id}`) : undefined, style: {
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            background: 'rgba(85, 110, 230, 0.06)', borderRadius: 6,
                                            padding: '10px 12px', marginBottom: 12,
                                            cursor: tienePermisoFPV ? 'pointer' : 'default',
                                            transition: 'background 0.15s ease',
                                        }, onMouseEnter: tienePermisoFPV ? (e) => { e.currentTarget.style.background = 'rgba(85, 110, 230, 0.12)'; } : undefined, onMouseLeave: tienePermisoFPV ? (e) => { e.currentTarget.style.background = 'rgba(85, 110, 230, 0.06)'; } : undefined, children: [_jsx(FileTextOutlined, { style: { color: '#556ee6', fontSize: 16, flexShrink: 0 } }), _jsxs("span", { style: { fontSize: 14, fontWeight: 600, color: tienePermisoFPV ? '#556ee6' : '#262626', flex: 1 }, children: [facturaData.documento?.codigo, "-", facturaData.noDocumento] }), facturaData.turno && _jsxs(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 4, flexShrink: 0 }, children: ["Turno ", facturaData.turno] }), tienePermisoFPV && _jsx(ArrowRightOutlined, { style: { color: '#556ee6', fontSize: 12 } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(CalendarOutlined, { style: { color: '#556ee6', marginRight: 8 } }), formatDate(facturaData.fechaDocumento)] }), facturaData.ncf && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(TagOutlined, { style: { color: '#556ee6', marginRight: 8 } }), facturaData.ncf] })), facturaData.cliente?.nombre && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(UserOutlined, { style: { color: '#556ee6', marginRight: 8 } }), toTitleCase(facturaData.cliente.nombre)] })), _jsxs("div", { style: { fontSize: 13 }, children: [_jsx(DollarOutlined, { style: { color: '#556ee6', marginRight: 8 } }), _jsx("span", { style: { fontWeight: 600, color: '#262626' }, children: formatCurrency(facturaData.total) })] }), facturaData.cajero && (_jsxs("div", { style: { fontSize: 13, color: '#595959' }, children: [_jsx(TeamOutlined, { style: { color: '#8c8c8c', marginRight: 8 } }), facturaData.cajero] }))] })] }))] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Factura Ref.:", children: data.factura?.documento?.codigo ? `${data.factura.documento.codigo}-${data.factura.noDocumento}` : '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : toTitleCase(data.concepto?.nombre || '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: data.tipo?.codigo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre || '')}` : '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(data.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Cliente:", children: toTitleCase(data.cliente?.nombre || data.entidad?.nombre || '-') }), _jsx(Descriptions.Item, { label: "NCF:", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Fecha Factura:", children: data.factura?.fechaDocumento ? formatDate(data.factura.fechaDocumento) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: toTitleCase(data.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                            // Secciones perezosas bajo demanda con guards anti doble fetch
                            if (key === 'detalles')
                                cargarSeccion('detalles');
                            if (key === 'asientos')
                                cargarSeccion('asientos');
                        }, tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1200 } }) }) })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data.asientos?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(AsientosContableTable, { asientos: data.asientos || [], scroll: { x: 900 } }) }) })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'consumo',
                                label: `Consumido en (${data.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: data.transaccionesAsociadas || [], onDocumentoClick: (doc) => {
                                        const docStr = doc.documento || '';
                                        const tipo = (docStr.split('-')[0] || '').toUpperCase();
                                        const rutas = { PV: '/FPV', DEV: '/FDEV', NC: '/FNC', ND: '/FND' };
                                        const ruta = rutas[tipo];
                                        if (ruta && doc.id)
                                            navigate(`${ruta}/${doc.id}`);
                                    } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: true, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), facturaData && (_jsxs(Card, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Factura Asociada" }), facturaData.documento?.codigo && (_jsx(Tag, { color: "blue", style: { marginLeft: 8, fontWeight: 400 }, children: facturaData.documento.codigo === 'PV' ? 'Punto de Venta' : facturaData.documento.codigo }))] }), className: "paces-card", style: { marginBottom: 16 }, children: [_jsxs("div", { onClick: tienePermisoFPV ? () => navigate(`/FPV/${facturaData.id}`) : undefined, style: {
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            background: 'rgba(85, 110, 230, 0.06)', borderRadius: 6,
                                            padding: '10px 12px', marginBottom: 12,
                                            cursor: tienePermisoFPV ? 'pointer' : 'default',
                                            transition: 'background 0.15s ease',
                                        }, onMouseEnter: tienePermisoFPV ? (e) => { e.currentTarget.style.background = 'rgba(85, 110, 230, 0.12)'; } : undefined, onMouseLeave: tienePermisoFPV ? (e) => { e.currentTarget.style.background = 'rgba(85, 110, 230, 0.06)'; } : undefined, children: [_jsx(FileTextOutlined, { style: { color: '#556ee6', fontSize: 16, flexShrink: 0 } }), _jsxs("span", { style: { fontSize: 14, fontWeight: 600, color: tienePermisoFPV ? '#556ee6' : '#262626', flex: 1 }, children: [facturaData.documento?.codigo, "-", facturaData.noDocumento] }), facturaData.turno && _jsxs(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 4, flexShrink: 0 }, children: ["Turno ", facturaData.turno] }), tienePermisoFPV && _jsx(ArrowRightOutlined, { style: { color: '#556ee6', fontSize: 12 } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(CalendarOutlined, { style: { color: '#556ee6', marginRight: 8 } }), formatDate(facturaData.fechaDocumento)] }), facturaData.ncf && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(TagOutlined, { style: { color: '#556ee6', marginRight: 8 } }), facturaData.ncf] })), facturaData.cliente?.nombre && (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(UserOutlined, { style: { color: '#556ee6', marginRight: 8 } }), toTitleCase(facturaData.cliente.nombre)] })), _jsxs("div", { style: { fontSize: 13 }, children: [_jsx(DollarOutlined, { style: { color: '#556ee6', marginRight: 8 } }), _jsx("span", { style: { fontWeight: 600, color: '#262626' }, children: formatCurrency(facturaData.total) })] }), facturaData.cajero && (_jsxs("div", { style: { fontSize: 13, color: '#595959' }, children: [_jsx(TeamOutlined, { style: { color: '#8c8c8c', marginRight: 8 } }), facturaData.cajero] }))] })] })), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Documento Escaneado", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsxs(Modal, { title: "Generar Nota de D\u00E9bito", open: modalNDOpen, onOk: handleConfirmarGenerarND, onCancel: () => setModalNDOpen(false), okText: "Confirmar", cancelText: "Cancelar", confirmLoading: generandoND, destroyOnHidden: true, children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, children: [_jsxs(Descriptions.Item, { label: "Documento", children: [data?.documento?.codigo, "-", data?.noDocumento] }), _jsx(Descriptions.Item, { label: "Cliente", children: toTitleCase(data?.cliente?.nombre || data?.entidad?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Monto Total", children: formatCurrency(data?.total ?? 0) })] }) }), _jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8, fontWeight: 500 }, children: "Fecha del Documento" }), _jsx(DatePicker, { style: { width: '100%' }, value: dayjs(fechaND), onChange: (val) => {
                                    if (val)
                                        setFechaND(val.format('YYYY-MM-DDTHH:mm:ss'));
                                }, format: "DD/MM/YYYY", disabledDate: (current) => {
                                    if (!current)
                                        return false;
                                    if (current.isAfter(dayjs(), 'day'))
                                        return true;
                                    const cierre = fechasCierre?.[sucursalActiva];
                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                        return true;
                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                        return true;
                                    return false;
                                } })] })] })] }));
};
export default DevolucionVentaDetalle;
