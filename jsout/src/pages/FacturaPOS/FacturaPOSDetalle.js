import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Input, message, Modal, Tooltip, Typography, QRCode, Badge, Dropdown } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, EditOutlined, LockFilled, CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined, RollbackOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { transaccionApi } from '../../api/transaccionApi';
import PermissionGate from '../../components/PermissionGate';
import LogTable from '../../components/LogTable';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { formatNumber, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { useQZTray } from '../../hooks/useQZTray';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import ErrorDetalle from '../../components/ErrorDetalle';
import DetalleToolbar from '../../components/DetalleToolbar';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import SucursalField from '../../components/SucursalField';
const { Text } = Typography;
const { TextArea } = Input;
function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatDate(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    const date = d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
}
const FacturaPOSDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [printerModalOpen, setPrinterModalOpen] = useState(false);
    const [printerList, setPrinterList] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [detalleSearch, setDetalleSearch] = useState('');
    const [devolucionesPV, setDevolucionesPV] = useState([]);
    const [dtransasocDevueltos, setDtransasocDevueltos] = useState(new Set());
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [razonAnulacion, setRazonAnulacion] = useState('');
    const [anulando, setAnulando] = useState(false);
    // ═══ Carga progresiva: banderas anti doble fetch por sección ═══
    const [detallesCargados, setDetallesCargados] = useState(false);
    const [cobrosCargados, setCobrosCargados] = useState(false);
    const [impuestosCargados, setImpuestosCargados] = useState(false);
    const [relacionadosCargados, setRelacionadosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const detallesCargadosRef = useRef(false);
    const cobrosCargadosRef = useRef(false);
    const impuestosCargadosRef = useRef(false);
    const relacionadosCargadosRef = useRef(false);
    // Refs para datos que llegan antes de que cargarEncabezado cree el objeto data.
    // Si cargarSeccion termina antes que cargarEncabezado, prev=null → se guardan aquí
    // y cargarEncabezado los aplica al crear data.
    const pendingCobrosRef = useRef(null);
    const pendingDetallesRef = useRef(null);
    const monedaDefault = getMonedaSucursalActiva();
    const screens = Grid.useBreakpoint();
    const qz = useQZTray();
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    const marcarSeccionesCompletas = React.useCallback(() => {
        setDetallesCargados(true);
        setCobrosCargados(true);
        setImpuestosCargados(true);
        setRelacionadosCargados(true);
    }, []);
    const handleRefresh = React.useCallback(() => {
        if (!id)
            return;
        // Limpiar refs pendientes para que la recarga empiece limpio
        pendingCobrosRef.current = null;
        pendingDetallesRef.current = null;
        setLoading(true);
        setLoadingError(false);
        facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            // Cargar devoluciones vinculadas via DTRANSIDASOC
            transaccionApi.obtenerDevolucionesPorPV(sucursalActiva, res.id)
                .then((devs) => {
                setDevolucionesPV(devs);
                if (devs.length > 0) {
                    Promise.all(devs.map((d) => devolucionVentaApi.obtenerPorId(sucursalActiva, d.id)
                        .then((dev) => (dev.detalles || []).map((det) => Number(det.idAsociado)))
                        .catch(() => []))).then((results) => {
                        const set = new Set();
                        for (const ids of results)
                            ids.forEach((id) => set.add(id));
                        setDtransasocDevueltos(set);
                    });
                }
            })
                .catch((err) => console.error('Error cargando devoluciones PV:', err));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride, marcarSeccionesCompletas]);
    // ═══════════════════════════════════════════════════════════════
    // Carga progresiva: encabezado primero + secciones críticas
    // ═══════════════════════════════════════════════════════════════
    const cargarEncabezado = React.useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await facturaPOSApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(prev => {
                const cobros = pendingCobrosRef.current ?? prev?.cobros ?? res.cobros;
                const detalles = pendingDetallesRef.current ?? prev?.detalles ?? res.detalles;
                pendingCobrosRef.current = null;
                pendingDetallesRef.current = null;
                return { ...(prev ?? {}), ...res, cobros, detalles };
            });
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Cargar devoluciones vinculadas via DTRANSIDASOC
            transaccionApi.obtenerDevolucionesPorPV(sucursalActiva, res.id)
                .then((devs) => {
                setDevolucionesPV(devs);
                if (devs.length > 0) {
                    Promise.all(devs.map((d) => devolucionVentaApi.obtenerPorId(sucursalActiva, d.id)
                        .then((dev) => (dev.detalles || []).map((det) => Number(det.idAsociado)))
                        .catch(() => []))).then((results) => {
                        const set = new Set();
                        for (const ids of results)
                            ids.forEach((id) => set.add(id));
                        setDtransasocDevueltos(set);
                    });
                }
            })
                .catch((err) => console.error('Error cargando devoluciones PV:', err));
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [id, sucursalActiva, setPageTitleOverride, message]);
    const cargarSeccion = React.useCallback(async (seccion) => {
        if (!id)
            return;
        // Guard anti doble fetch ANTES de cualquier setState: si la sección ya está
        // cargada, salir sin re-render. Esto corta los loops de "Maximum update depth".
        if ((seccion === 'detalles' && detallesCargadosRef.current) ||
            (seccion === 'cobros' && cobrosCargadosRef.current) ||
            (seccion === 'impuestos' && impuestosCargadosRef.current) ||
            (seccion === 'relacionados' && relacionadosCargadosRef.current)) {
            return;
        }
        setSeccionesCargando(prev => new Set(prev).add(seccion));
        try {
            const suc = sucursalActiva;
            const numId = parseInt(id);
            switch (seccion) {
                case 'detalles': {
                    const detalles = await facturaPOSApi.obtenerDetalles(suc, numId);
                    setData(prev => ({ ...(prev ?? {}), detalles }));
                    pendingDetallesRef.current = detalles;
                    setDetallesCargados(true);
                    break;
                }
                case 'cobros': {
                    const cobros = await facturaPOSApi.obtenerCobros(suc, numId);
                    setData(prev => (prev ? { ...prev, cobros } : prev));
                    // Si prev era null (cargarEncabezado aún no creó data), guardar en ref
                    // para que cargarEncabezado los aplique al crear data.
                    pendingCobrosRef.current = cobros;
                    setCobrosCargados(true);
                    break;
                }
                case 'impuestos': {
                    const impuestosFactura = await facturaPOSApi.obtenerImpuestos(suc, numId);
                    setData(prev => (prev ? { ...prev, impuestosFactura } : prev));
                    setImpuestosCargados(true);
                    break;
                }
                case 'relacionados': {
                    const transaccionesAsociadas = await facturaPOSApi.obtenerRelacionados(suc, numId);
                    setData(prev => (prev ? { ...prev, transaccionesAsociadas } : prev));
                    setRelacionadosCargados(true);
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
    }, [id, sucursalActiva, message]);
    const handleGenerarPVC = React.useCallback(async () => {
        if (!id || !data)
            return;
        Modal.confirm({
            title: 'Generar PVC',
            content: `¿Generar PVC para ${data.documento?.codigo}-${data.noDocumento}?`,
            okText: 'Generar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setSaving(true);
                try {
                    await facturaPOSApi.generarPVC(sucursalActiva, parseInt(id));
                    message.success('PVC creado exitosamente');
                    handleRefresh();
                }
                catch (err) {
                    const msg = err?.response?.data?.errorMessage || 'Error al generar PVC';
                    message.error(msg);
                }
                finally {
                    setSaving(false);
                }
            },
        });
    }, [id, data, sucursalActiva, handleRefresh]);
    // Montaje: encabezado primero, luego secciones críticas. Ant Design no dispara
    // onChange con defaultActiveKey, por eso la pestaña por defecto se carga aquí.
    useEffect(() => {
        cargarEncabezado();
        cargarSeccion('detalles');
    }, [cargarEncabezado, cargarSeccion]);
    // Sincronizar refs de banderas para evitar stale closures en cargarSeccion
    useEffect(() => { detallesCargadosRef.current = detallesCargados; }, [detallesCargados]);
    useEffect(() => { cobrosCargadosRef.current = cobrosCargados; }, [cobrosCargados]);
    useEffect(() => { impuestosCargadosRef.current = impuestosCargados; }, [impuestosCargados]);
    useEffect(() => { relacionadosCargadosRef.current = relacionadosCargados; }, [relacionadosCargados]);
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FPV", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(data.estado);
    const esCerrado = toPeriodoNum(data.periodo) === 6;
    const totalPagado = (data.cobros || []).reduce((sum, c) => sum + (Number(c.pago) || 0), 0);
    const saldoPendiente = (data.total || 0) - totalPagado;
    const detallesFiltrados = detalleSearch
        ? (data.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (data.detalles || []);
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
            render: (_, record) => {
                const devuelto = dtransasocDevueltos.has(record.id);
                return (_jsxs("div", { children: [_jsx("div", { children: devuelto ? (_jsx("span", { style: { textDecoration: 'line-through', color: '#ff4d4f' }, children: formatNumber(record.cantidad || 0) })) : (_jsx("span", { children: formatNumber(record.cantidad || 0) })) }), record.medida?.nombre && (_jsx(Tooltip, { title: record.medida.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida.nombre }) }))] }));
            },
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
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
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => (_jsxs("div", { children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5 }, children: "\u00A0" })] })),
        },
    ];
    // ===== Handlers de acciones de estado =====
    const handleAplicar = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await facturaPOSApi.aplicar(sucursalActiva, parseInt(id));
            message.success('Documento aplicado exitosamente');
            const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al aplicar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await facturaPOSApi.anular(sucursalActiva, data);
            message.success('Documento anulado exitosamente');
            const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id));
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
    const handlePostear = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await facturaPOSApi.postear(sucursalActiva, data);
            message.success('Documento posteado exitosamente');
            const res = await facturaPOSApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al postear');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAnularPV = async () => {
        if (!razonAnulacion.trim()) {
            message.error('Debe ingresar una razón para la anulación');
            return;
        }
        setAnulando(true);
        try {
            // Cargar la factura completa para obtener todos los detalles
            const facturaFull = await devolucionVentaApi.obtenerFacturaPOS(sucursalActiva, data.id);
            if (!facturaFull?.detalles || facturaFull.detalles.length === 0) {
                message.error('La factura no tiene detalles para anular');
                return;
            }
            // Mapear todos los detalles con cantidad completa (devolver todo)
            const detalles = facturaFull.detalles
                .filter((d) => d.id > 0)
                .map((d) => ({
                idAsociado: d.id,
                cantidad: d.cantidad || 0,
                precio: d.precio || 0,
                porcentajeDescuento: d.porcentajeDescuento || 0,
                porcentajeImpuesto: d.porcentajeImpuesto || 0,
            }));
            const result = await devolucionVentaApi.crearDesdePV(sucursalActiva, data.id, {
                detalles,
                nota: razonAnulacion.trim(),
            });
            message.success('Devolución por anulación creada exitosamente');
            setModalAnularOpen(false);
            setRazonAnulacion('');
            navigate(`/FDEV/${result.id}`);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al crear la devolución por anulación');
            message.error(msg);
        }
        finally {
            setAnulando(false);
        }
    };
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
    const printMenuItems = [
        { key: 'ticket', label: 'Ticket' },
        { key: 'factura-cliente', label: 'Factura Cliente' },
    ];
    const handlePrintMenuClick = ({ key }) => {
        if (key === 'ticket') {
            handlePrintTicket();
        }
        else if (key === 'factura-cliente') {
            handlePrintFacturaCliente();
        }
    };
    const fallbackPDF = async () => {
        const res = await apiClient.post(`/reportes/facturacion/pos/${sucursalActiva}`, data, {
            responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(res.data);
        window.open(blobUrl, '_blank');
    };
    const handlePrintTicket = async () => {
        setImprimiendo(true);
        try {
            // Marcar como impreso (no-bloqueante: si falla, igual imprime)
            documentoImpresionApi.marcarImpreso('PV', sucursalActiva, parseInt(id)).catch((errImprimir) => {
                console.warn('No se pudo marcar como impreso:', errImprimir?.response?.data?.errorMessage || errImprimir?.message);
            });
            // Generar PDF del ticket desde el backend
            const res = await apiClient.post(`/reportes/facturacion/pos/${sucursalActiva}`, data, {
                responseType: 'blob',
            });
            const pdfBlob = res.data;
            // Imprimir como imagen via QZ Tray
            try {
                await qz.printPDF(pdfBlob);
                message.success(`Ticket imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
            }
            catch (errQZ) {
                if (errQZ.code === 'NO_PRINTER_SELECTED') {
                    try {
                        const list = await qz.fetchPrinters();
                        if (list.length === 0) {
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            window.open(blobUrl, '_blank');
                        }
                        else {
                            setPrinterList(list);
                            setSelectedPrinter(list[0] || '');
                            setPrinterModalOpen(true);
                        }
                    }
                    catch {
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        window.open(blobUrl, '_blank');
                    }
                }
                else {
                    console.warn('QZ Tray error en Ticket:', errQZ.message);
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, '_blank');
                }
            }
        }
        catch (err) {
            const msg = err?.response?.data?.ErrorMessage || 'Error al generar el ticket';
            message.error(msg);
        }
        finally {
            setImprimiendo(false);
        }
    };
    const imprimirPDF = async () => {
        const res = await apiClient.post(`/reportes/facturacion/pos/${sucursalActiva}`, data, {
            responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(res.data);
        window.open(blobUrl, '_blank');
    };
    const handlePrintFacturaCliente = async () => {
        setImprimiendo(true);
        try {
            try {
                await documentoImpresionApi.marcarImpreso('PV', sucursalActiva, parseInt(id));
            }
            catch (errImprimir) {
                message.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                return;
            }
            const res = await apiClient.post(`/reportes/facturacion/pos/factura-cliente`, data, {
                responseType: 'blob',
            });
            const pdfBlob = res.data;
            // Intentar imprimir directo a la impresora térmica via QZ Tray
            try {
                await qz.printPDF(pdfBlob);
                message.success(`Factura Cliente imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
            }
            catch (errQZ) {
                if (errQZ.code === 'NO_PRINTER_SELECTED') {
                    // Mostrar selector de impresora; al seleccionar, reintentar
                    try {
                        const list = await qz.fetchPrinters();
                        if (list.length === 0) {
                            // Sin impresoras: abrir PDF en navegador como fallback
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            window.open(blobUrl, '_blank');
                        }
                        else {
                            setPrinterList(list);
                            setSelectedPrinter(list[0] || '');
                            setPrinterModalOpen(true);
                            // NOTA: al cerrar el modal con una impresora seleccionada,
                            // el usuario debe volver a dar click en Factura Cliente para reintentar.
                        }
                    }
                    catch {
                        const blobUrl = URL.createObjectURL(pdfBlob);
                        window.open(blobUrl, '_blank');
                    }
                }
                else {
                    // Otro error de QZ (impresora no encontrada, etc.): fallback a navegador
                    console.warn('QZ Tray error en Factura Cliente:', errQZ.message);
                    const blobUrl = URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, '_blank');
                }
            }
        }
        catch (err) {
            const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
            message.error(msg);
        }
        finally {
            setImprimiendo(false);
        }
    };
    return (_jsxs("div", { children: [_jsx(DetalleToolbar, { modulo: screenCode, showImprimir: false, estado: data.estado, periodo: data.periodo, saving: saving, imprimiendo: imprimiendo, onVolver: () => navigate(-1), onEditar: () => navigate(`/FPV/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, confirmActions: false, extraButtons: _jsxs(_Fragment, { children: [_jsxs(PermissionGate, { codigoPantalla: screenCode, accion: "IMPRIMIR", children: [_jsx(Dropdown, { menu: { items: printMenuItems, onClick: handlePrintMenuClick }, trigger: ['click'], children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo }) }), qz.printerName && (_jsxs(Tag, { color: "success", style: { marginLeft: 2, fontSize: 11, lineHeight: '18px' }, children: ["QZ: ", qz.printerName] }))] }), data.documento?.codigo === 'PV' && data.estado !== 0 && data.estado !== 3 && saldoPendiente > 0.01 && (_jsx(Button, { icon: _jsx(CreditCardOutlined, {}), onClick: handleGenerarPVC, children: "Generar PVC" })), data.estado !== 0 && data.estado !== 3 && dtransasocDevueltos.size < (data.detalles?.length || 0) && (_jsx(PermissionGate, { codigoPantalla: "FPV", permisoEspecial: "pe_crear_devolucion", children: _jsx(Dropdown, { menu: {
                                    items: [
                                        { key: 'anular', label: 'Anular', icon: _jsx(CloseCircleOutlined, {}) },
                                        { key: 'devolver', label: 'Devolver', icon: _jsx(RollbackOutlined, {}) },
                                    ],
                                    onClick: ({ key }) => {
                                        if (key === 'anular') {
                                            setModalAnularOpen(true);
                                        }
                                        else if (key === 'devolver') {
                                            navigate(`/FDEV/nuevo?pvId=${data.id}`);
                                        }
                                    },
                                }, trigger: ['click'], children: _jsx(Button, { type: "primary", icon: _jsx(RollbackOutlined, {}), children: "Crear Devoluci\u00F3n" }) }) }))] }) }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDateTime(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "NCF", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), _jsx(Descriptions.Item, { label: "Almacen", span: 2, children: data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Cajero", children: data.cajero ? toTitleCase(data.cajero) : '-' }), _jsx(Descriptions.Item, { label: "Punto de Venta", children: data.caja || '-' }), _jsx(Descriptions.Item, { label: "Turno", children: data.turno ? (data.turno.includes('(Local)') ? (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsx("span", { children: data.turno.replace(' (Local)', '') }), _jsx(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }, children: "Local" })] })) : data.turno) : (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', width: '100%' }, children: _jsx(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }, children: "Local" }) })) }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                                    // Secciones perezosas bajo demanda con guards anti doble fetch
                                    if (key === 'impuestos')
                                        cargarSeccion('impuestos');
                                    if (key === 'relacionados')
                                        cargarSeccion('relacionados');
                                }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${data.detalles?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${data.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                                    },
                                    {
                                        key: 'impuestos',
                                        label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('impuestos'), tip: "Cargando impuestos...", children: _jsx("div", { style: { minHeight: 120 }, children: _jsx(Table, { dataSource: data.impuestosFactura || [], rowKey: (r, i) => r.id || r.impuesto?.codigo || i, size: "small", pagination: false, scroll: { x: 500 }, columns: [
                                                        { title: 'Impuesto', key: 'nombre', render: (_, r) => toTitleCase(r.impuesto?.nombre || '-') },
                                                        { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right', render: (_, r) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                                                        { title: 'Monto', key: 'monto', width: 130, align: 'right', render: (_, r) => _jsx(Text, { strong: true, children: formatNumber(r.monto || 0) }) },
                                                        { title: 'Tipo', key: 'tipo', width: 110, render: (_, r) => r.tipo || '-' },
                                                    ] }) }) })),
                                    },
                                    ...(devolucionesPV.length > 0 ? [{
                                            key: 'devoluciones',
                                            label: (_jsxs("span", { children: ["Devoluciones", _jsx(Badge, { count: devolucionesPV.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } })] })),
                                            children: (_jsx(Table, { dataSource: devolucionesPV, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, columns: [
                                                    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                                                        render: (v) => formatDate(v),
                                                    },
                                                    { title: 'Documento', key: 'documento', width: 160,
                                                        render: (_, rec) => (_jsx("a", { className: "paces-doc-link", onClick: () => navigate(`/FDEV/${rec.id}`), style: { cursor: 'pointer' }, children: `${rec.documento}-${rec.noDocumento}` })),
                                                    },
                                                    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                                                        render: (v) => v || '-',
                                                    },
                                                ] })),
                                        }] : []),
                                    ...(data.transaccionesAsociadas?.length ? [{
                                            key: 'relacionados',
                                            label: (_jsxs("span", { children: ["Documentos Relacionados", _jsx(Badge, { count: data.transaccionesAsociadas.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } })] })),
                                            children: (_jsx(Table, { dataSource: data.transaccionesAsociadas, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, columns: [
                                                    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                                                        render: (v) => formatDate(v),
                                                    },
                                                    { title: 'Documento', key: 'documento', width: 160,
                                                        render: (_, rec) => (_jsx("a", { className: "paces-doc-link", onClick: () => navigate(`/FDEV/${rec.transaccionAsociadaID}`), style: { cursor: 'pointer' }, children: rec.documento || 'DEV' })),
                                                    },
                                                    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                                                        render: (v) => v || '-',
                                                    },
                                                    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right',
                                                        render: (v) => _jsx(Text, { strong: true, children: formatNumber(v || 0) }),
                                                    },
                                                ] })),
                                        }] : []),
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: data.cliente, entidadSecundaria: data.entidad, fallbackTitulo: "Cliente" }), _jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: false, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(CobrosMinimal, { cobrosPOS: data.cobros?.[0], loading: loading }), data?.envioDGII?.codigoQR && (_jsx("div", { style: { textAlign: 'center', marginBottom: 16 }, children: _jsx(QRCode, { value: data.envioDGII.codigoQR, size: 140 }) }))] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDateTime(data.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: "\u2014" }), _jsx(Descriptions.Item, { label: "NCF", children: data.ncf || '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) }), _jsx(Descriptions.Item, { label: "Almacen", children: data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Cajero", children: data.cajero ? toTitleCase(data.cajero) : '-' }), _jsx(Descriptions.Item, { label: "Punto de Venta", children: data.caja || '-' }), _jsx(Descriptions.Item, { label: "Turno", children: data.turno ? (data.turno.includes('(Local)') ? (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsx("span", { children: data.turno.replace(' (Local)', '') }), _jsx(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }, children: "Local" })] })) : data.turno) : (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', width: '100%' }, children: _jsx(Tag, { style: { background: '#d9d9d9', borderColor: '#d9d9d9', color: '#595959', marginRight: 0 }, children: "Local" }) })) }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data.nota || '-' }) })] }) }), _jsx(EntidadCard, { entidad: data.cliente, entidadSecundaria: data.entidad, fallbackTitulo: "Cliente" }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", onChange: (key) => {
                            // Secciones perezosas bajo demanda con guards anti doble fetch
                            if (key === 'impuestos')
                                cargarSeccion('impuestos');
                            if (key === 'relacionados')
                                cargarSeccion('relacionados');
                        }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${data.detalles?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'impuestos',
                                label: `Impuestos (${data.impuestosFactura?.length || 0})`,
                                children: (_jsx(Table, { dataSource: data.impuestosFactura || [], rowKey: (r) => r.id || r.impuesto?.codigo || Math.random(), size: "small", pagination: false, scroll: { x: 500 }, columns: [
                                        { title: 'Impuesto', key: 'nombre', render: (_, r) => toTitleCase(r.impuesto?.nombre || '-') },
                                        { title: 'Porcentaje', key: 'porcentaje', width: 110, align: 'right', render: (_, r) => r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-' },
                                        { title: 'Monto', key: 'monto', width: 130, align: 'right', render: (_, r) => _jsx(Text, { strong: true, children: formatNumber(r.monto || 0) }) },
                                        { title: 'Tipo', key: 'tipo', width: 110, render: (_, r) => r.tipo || '-' },
                                    ] })),
                            },
                            ...(devolucionesPV.length > 0 ? [{
                                    key: 'devoluciones',
                                    label: (_jsxs("span", { children: ["Devoluciones", _jsx(Badge, { count: devolucionesPV.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } })] })),
                                    children: (_jsx(Table, { dataSource: devolucionesPV, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, columns: [
                                            { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                                                render: (v) => formatDate(v),
                                            },
                                            { title: 'Documento', key: 'documento', width: 160,
                                                render: (_, rec) => (_jsx("a", { className: "paces-doc-link", onClick: () => navigate(`/FDEV/${rec.id}`), style: { cursor: 'pointer' }, children: `${rec.documento}-${rec.noDocumento}` })),
                                            },
                                            { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                                                render: (v) => v || '-',
                                            },
                                        ] })),
                                }] : []),
                            ...(data.transaccionesAsociadas?.length ? [{
                                    key: 'relacionados',
                                    label: (_jsxs("span", { children: ["Documentos Relacionados", _jsx(Badge, { count: data.transaccionesAsociadas.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } })] })),
                                    children: (_jsx(Table, { dataSource: data.transaccionesAsociadas, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, columns: [
                                            { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110,
                                                render: (v) => formatDate(v),
                                            },
                                            { title: 'Documento', key: 'documento', width: 160,
                                                render: (_, rec) => (_jsx("a", { className: "paces-doc-link", onClick: () => navigate(`/FDEV/${rec.transaccionAsociadaID}`), style: { cursor: 'pointer' }, children: rec.documento || 'DEV' })),
                                            },
                                            { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150,
                                                render: (v) => v || '-',
                                            },
                                            { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right',
                                                render: (v) => _jsx(Text, { strong: true, children: formatNumber(v || 0) }),
                                            },
                                        ] })),
                                }] : []),
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, total: data.total, alignRight: true, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(CobrosMinimal, { cobrosPOS: data.cobros?.[0], loading: loading }), data?.envioDGII?.codigoQR && (_jsx("div", { style: { textAlign: 'center' }, children: _jsx(QRCode, { value: data.envioDGII.codigoQR, size: 140 }) }))] })] })), _jsxs(Modal, { title: "Anular Factura POS", open: modalAnularOpen, onCancel: () => { setModalAnularOpen(false); setRazonAnulacion(''); }, onOk: handleAnularPV, okText: "Confirmar Anulaci\u00F3n", cancelText: "Cancelar", okButtonProps: { danger: true, loading: anulando }, confirmLoading: anulando, destroyOnHidden: true, children: [_jsxs("p", { style: { marginBottom: 12 }, children: ["Se crear\u00E1 una devoluci\u00F3n con ", _jsx("strong", { children: "todos los art\u00EDculos" }), " de la factura POS. Ingrese la raz\u00F3n de la anulaci\u00F3n:"] }), _jsx(TextArea, { rows: 4, maxLength: 500, showCount: true, value: razonAnulacion, onChange: (e) => setRazonAnulacion(e.target.value), placeholder: "Raz\u00F3n de la anulaci\u00F3n..." })] }), _jsx(ModalSeleccionarImpresoraPOS, { open: printerModalOpen, impresoras: printerList, seleccionada: selectedPrinter, onSelect: setSelectedPrinter, onConfirm: async () => {
                    if (!selectedPrinter)
                        return;
                    qz.selectPrinter(selectedPrinter);
                    setPrinterModalOpen(false);
                    // Reintentar impresión
                    handlePrintTicket();
                }, onClose: () => { setPrinterModalOpen(false); } })] }));
};
export default FacturaPOSDetalle;
