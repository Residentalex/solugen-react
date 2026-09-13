import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message, Input, Tooltip, Typography, Modal, Alert, App, QRCode, Switch, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, EnvironmentOutlined, ExclamationCircleOutlined, FileSearchOutlined, FileTextOutlined, IdcardOutlined, LockFilled, PhoneOutlined, PrinterOutlined, RedoOutlined, SendOutlined, } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { dgiiApi } from '../../api/dgiiApi';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import DetalleToolbar from '../../components/DetalleToolbar';
import ErrorDetalle from '../../components/ErrorDetalle';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import NotasSeguimientoCard from '../../components/NotasSeguimientoCard';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
const { Text } = Typography;
const FacturaClienteDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig('FFAC');
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
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [pagosAsociados, setPagosAsociados] = useState([]);
    // ═══ Carga progresiva (piloto): banderas anti doble fetch por sección ═══
    const [detallesCargados, setDetallesCargados] = useState(false);
    const [asientosCargados, setAsientosCargados] = useState(false);
    const [pagosCargados, setPagosCargados] = useState(false);
    const [cobrosCargados, setCobrosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const detallesCargadosRef = useRef(false);
    const asientosCargadosRef = useRef(false);
    const pagosCargadosRef = useRef(false);
    const cobrosCargadosRef = useRef(false);
    const monedaDefault = getMonedaSucursalActiva();
    const screens = Grid.useBreakpoint();
    const { message } = App.useApp();
    const operacion = useAplicar();
    // setBalanceInfo es un useCallback estable (deps []); desestructurarlo evita
    // que cargarSeccion dependa del objeto `operacion` (nuevo en cada render).
    const { setBalanceInfo: setBalanceInfoAplicar } = operacion;
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [estadoDGII, setEstadoDGII] = useState(null);
    const [enviandoDGII, setEnviandoDGII] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const [modalNCCLIAbierto, setModalNCCLIAbierto] = useState(false);
    const [generandoNCCLI, setGenerandoNCCLI] = useState(false);
    const [fechaNC, setFechaNC] = useState(dayjs());
    const [ncfNC, setNcfNC] = useState('');
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (res.estado === 3 && res.reversoID) {
                facturaClienteApi.obtenerReverso(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Datos ya disponibles desde el DTO principal
            setPagosAsociados(res.transaccionesAsociadas || []);
            setEstadoDGII(res.envioDGII || null);
            // Cargar documentos relacionados (única llamada extra necesaria)
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => { setDocumentosRelacionados(rel || []); })
                .catch((err) => console.warn('Error al cargar documentos relacionados', err));
            // Recarga completa: todas las secciones quedan cargadas
            setDetallesCargados(true);
            setAsientosCargados(true);
            setPagosCargados(true);
            setCobrosCargados(true);
            // Verificar scanner (ruta real: /Transaccion/...)
            facturaClienteApi.verificarScan(sucursalActiva, parseInt(id))
                .then((r) => setTieneScan(r?.existe ?? false))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al recargar');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // ═══════════════════════════════════════════════════════════════
    // Carga progresiva (piloto): encabezado primero + secciones críticas
    // ═══════════════════════════════════════════════════════════════
    const cargarEncabezado = useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await facturaClienteApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (res.estado === 3 && res.reversoID) {
                facturaClienteApi.obtenerReverso(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            setEstadoDGII(res.envioDGII || null);
            // Verificar scanner (ruta real: /Transaccion/...)
            facturaClienteApi.verificarScan(sucursalActiva, parseInt(id))
                .then((r) => setTieneScan(r?.existe ?? false))
                .catch(() => setTieneScan(false));
            // Cargar documentos relacionados (única llamada extra necesaria)
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => { setDocumentosRelacionados(rel || []); })
                .catch((err) => console.warn('Error al cargar documentos relacionados', err));
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
    const cargarSeccion = useCallback(async (seccion) => {
        if (!id)
            return;
        // Guard anti doble fetch ANTES de cualquier setState: si la sección ya está
        // cargada, salir sin re-render. Esto corta los loops de "Maximum update depth"
        // cuando el efecto de montaje se re-ejecuta (StrictMode o deps que cambian).
        if ((seccion === 'detalles' && detallesCargadosRef.current) ||
            (seccion === 'asientos' && asientosCargadosRef.current) ||
            (seccion === 'pagos' && pagosCargadosRef.current) ||
            (seccion === 'cobros' && cobrosCargadosRef.current)) {
            return;
        }
        setSeccionesCargando(prev => new Set(prev).add(seccion));
        try {
            const suc = sucursalActiva;
            const numId = parseInt(id);
            switch (seccion) {
                case 'detalles': {
                    const detalles = await facturaClienteApi.obtenerDetalles(suc, numId);
                    setData(prev => (prev ? { ...prev, detalles } : prev));
                    setDetallesCargados(true);
                    break;
                }
                case 'asientos': {
                    const asientos = await facturaClienteApi.obtenerAsientos(suc, numId);
                    setData(prev => (prev ? { ...prev, asientos } : prev));
                    const totalDeb = (asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
                    const totalCred = (asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
                    setBalanceInfoAplicar({ debitos: totalDeb, creditos: totalCred });
                    setAsientosCargados(true);
                    break;
                }
                case 'pagos': {
                    const pagos = await facturaClienteApi.obtenerPagos(suc, numId);
                    setPagosAsociados(pagos || []);
                    setData(prev => (prev ? { ...prev, transaccionesAsociadas: pagos || [] } : prev));
                    setPagosCargados(true);
                    break;
                }
                case 'cobros': {
                    const cobros = await facturaClienteApi.obtenerCobros(suc, numId);
                    setData(prev => (prev ? { ...prev, cobros } : prev));
                    setCobrosCargados(true);
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
    }, [id, sucursalActiva, setBalanceInfoAplicar, message]);
    // Montaje: encabezado primero, luego secciones críticas. Ant Design no dispara
    // onChange con defaultActiveKey, por eso la pestaña por defecto se carga aquí.
    useEffect(() => {
        const init = async () => {
            await cargarEncabezado();
            await Promise.all([
                cargarSeccion('detalles'),
                cargarSeccion('pagos'),
                cargarSeccion('cobros'),
                cargarSeccion('asientos'),
            ]);
        };
        init();
    }, [cargarEncabezado, cargarSeccion]);
    // Sincronizar refs de banderas para evitar stale closures en cargarSeccion
    useEffect(() => { detallesCargadosRef.current = detallesCargados; }, [detallesCargados]);
    useEffect(() => { asientosCargadosRef.current = asientosCargados; }, [asientosCargados]);
    useEffect(() => { pagosCargadosRef.current = pagosCargados; }, [pagosCargados]);
    useEffect(() => { cobrosCargadosRef.current = cobrosCargados; }, [cobrosCargados]);
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'FAC'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'FAC'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FFAC", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    const tienePagos = pagosAsociados.length > 0;
    const codigoQR = data?.envioDGII?.codigoQR || estadoDGII?.codigoQR;
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? (documentoActivo?.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (documentoActivo?.detalles || []);
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
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await facturaClienteApi.descargarScan(sucursalActiva, parseInt(id));
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
    const handleDesaplicarConfirm = async (_motivo) => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await facturaClienteApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
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
        // FC15 - Validar FechaPermitida
        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
            const hoy = new Date();
            const fechaDoc = new Date(data.fechaDocumento);
            if (fechaDoc > hoy) {
                message.error('La fecha del documento no puede ser mayor a la fecha del día.');
                return;
            }
        }
        setOperacionTitulo(`Aplicando FAC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/FAC/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data)
            return;
        setSaving(true);
        try {
            const dto = {
                ...data,
                fechaDocumento: dataAnular.fecha,
                nota: `${data.nota || ''} Documento anulado por: ${dataAnular.motivo}.`,
            };
            await facturaClienteApi.anular(sucursalActiva, dto);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await facturaClienteApi.obtenerReverso(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
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
        if (data.concepto?.noAsientos) {
            message.info('El concepto no genera asientos contables.');
            return;
        }
        if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
            message.info('Debe aplicar el documento antes de postear.');
            return;
        }
        setOperacionTitulo(`Posteando FAC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/FAC/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await facturaClienteApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await facturaClienteApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await facturaClienteApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await facturaClienteApi.obtenerReverso(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al reversar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleMarcarEnviado = async () => {
        if (!id || !data)
            return;
        setEnviandoDGII(true);
        try {
            await dgiiApi.marcarEnviado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como enviado exitosamente');
            const { data: resp } = await apiClient.get(`/DGII/${sucursalActiva}/${id}`);
            setEstadoDGII(resp?.data || null);
            handleRefresh();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al marcar como enviado';
            message.error(msg);
        }
        finally {
            setEnviandoDGII(false);
        }
    };
    const handleEnviarDGII = async () => {
        if (!id || !data)
            return;
        setEnviandoDGII(true);
        try {
            const respuesta = await dgiiApi.cargarYEnviarFactura(sucursalActiva, parseInt(id), 'FAC');
            message.success('Documento enviado a la DGII exitosamente');
            setEstadoDGII({
                ...respuesta,
                codigoQR: respuesta?.urlCodigoQr,
            });
            handleRefresh();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al enviar a la DGII';
            message.error(msg);
        }
        finally {
            setEnviandoDGII(false);
        }
    };
    const handleReasignarNCF = async () => {
        if (!id || !data)
            return;
        Modal.confirm({
            title: 'Reasignar NCF',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Desea reasignar un nuevo NCF a esta factura?',
            okText: 'Sí',
            cancelText: 'No',
            onOk: async () => {
                setSaving(true);
                try {
                    const tipoNCF = documentoActivo?.transaccionNCF?.tipoComprobante;
                    if (!tipoNCF) {
                        message.error('No se pudo determinar el tipo de NCF');
                        setSaving(false);
                        return;
                    }
                    await apiClient.put(`/Transaccion/${sucursalActiva}/ncf?tipoNCF=${tipoNCF}&idTransaccion=${id}`);
                    message.success('NCF reasignado correctamente');
                    handleRefresh();
                }
                catch (err) {
                    const msg = err?.response?.data?.errorMessage || 'Error al reasignar NCF';
                    message.error(msg);
                }
                finally {
                    setSaving(false);
                }
            },
        });
    };
    const handleGenerarNotaCredito = async (enviarDGII) => {
        if (!id || !data)
            return;
        if (!fechaNC) {
            message.warning('Debe seleccionar una fecha.');
            return;
        }
        setGenerandoNCCLI(true);
        try {
            const { data: resp } = await apiClient.post(`/FAC/${sucursalActiva}/${id}/generar-nota-credito`, {
                esCompleta: true,
                fecha: fechaNC.format('YYYY-MM-DD'),
                ncf: ncfNC || null,
                enviarDGII
            });
            const ncId = resp?.data;
            if (ncId) {
                message.success(enviarDGII ? 'Nota de Crédito generada y enviada a DGII exitosamente' : 'Nota de Crédito generada exitosamente');
                setModalNCCLIAbierto(false);
                setFechaNC(dayjs());
                setNcfNC('');
                navigate(`/FNCCLI/${ncId}`);
            }
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al generar Nota de Crédito';
            message.error(msg);
        }
        finally {
            setGenerandoNCCLI(false);
        }
    };
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de factura de cliente", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: screenCode, estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('FAC', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            message.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const dataToPrint = estadoDGII ? { ...data, envioDGII: estadoDGII } : data;
                        const res = await apiClient.post('/reportes/contabilidad/factura-cliente', dataToPrint, {
                            responseType: 'blob',
                        });
                        const blobUrl = URL.createObjectURL(res.data);
                        window.open(blobUrl, '_blank');
                    }
                    catch (err) {
                        const msg = err?.response?.data?.ErrorMessage || 'Error al generar el PDF';
                        message.error(msg);
                    }
                    finally {
                        setImprimiendo(false);
                    }
                }, onEditar: () => navigate(`/FFAC/${id}/editar`), onAplicar: handleAplicar, onAnular: tienePagos ? undefined : async () => setModalAnularOpen(true), onPostear: documentoActivo.concepto?.noAsientos ? undefined : handlePostear, onRevisado: handleRevisado, onDesaplicar: tienePagos ? undefined : async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), _jsxs(Space, { children: [codigoQR && (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "DGII OK" })), !codigoQR && !!documentoActivo?.ncf && (_jsx(PermissionGate, { codigoPantalla: "FFAC", permisoEspecial: "pe_marcar_enviado", children: _jsx(Button, { icon: _jsx(SendOutlined, {}), size: "small", onClick: handleEnviarDGII, loading: enviandoDGII, disabled: toEstadoNum(documentoActivo.estado) !== 1, children: "Enviar DGII" }) })), _jsx(PermissionGate, { codigoPantalla: "FFAC", permisoEspecial: "pe_preasignar_ncf", children: _jsx(Button, { icon: _jsx(FileTextOutlined, {}), size: "small", onClick: handleReasignarNCF, disabled: toEstadoNum(documentoActivo.estado) !== 1, children: "Reasignar NCF" }) }), _jsx(Divider, { type: "vertical" }), !data?.transaccionesAsociadas?.some(t => t.tipoDocumento === 'NC' || (t.documento && t.documento.startsWith('NC-'))) && (_jsx(PermissionGate, { codigoPantalla: "FFAC", permisoEspecial: "pe_generar_nccli", children: _jsx(Button, { icon: _jsx(FileTextOutlined, {}), size: "small", onClick: () => setModalNCCLIAbierto(true), disabled: toEstadoNum(documentoActivo.estado) !== 1, children: "Nota Cr\u00E9dito" }) }))] })] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Almacen", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal", span: 3, children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                                    },
                                    {
                                        key: 'transacciones',
                                        label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: true, loading: seccionesCargando.has('pagos') })),
                                    },
                                    {
                                        key: 'notas',
                                        label: `Notas (${data?.notasSeguimiento?.length || 0})`,
                                        children: (_jsx(NotasSeguimientoCard, { notas: data?.notasSeguimiento || [], readOnly: true })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), children: _jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 900 } }) })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.cliente, fallbackTitulo: "Cliente" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(CobrosMinimal, { cobrosArray: data?.cobros, loading: loading || seccionesCargando.has('cobros') }), codigoQR && (_jsx("div", { style: { textAlign: 'center', marginBottom: 16 }, children: _jsx(QRCode, { value: codigoQR, size: 140 }) })), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Almacen", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(EntidadCard, { entidad: documentoActivo.cliente, fallbackTitulo: "Cliente" }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
                            },
                            {
                                key: 'transacciones',
                                label: `Documentos (${data?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: true, loading: seccionesCargando.has('pagos') })),
                            },
                            {
                                key: 'notas',
                                label: `Notas (${data?.notasSeguimiento?.length || 0})`,
                                children: (_jsx(NotasSeguimientoCard, { notas: data?.notasSeguimiento || [], readOnly: true })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), children: _jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 900 } }) })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(CobrosMinimal, { cobrosArray: data?.cobros, loading: loading || seccionesCargando.has('cobros') }), codigoQR && (_jsx("div", { style: { textAlign: 'center' }, children: _jsx(QRCode, { value: codigoQR, size: 140 }) }))] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento.codigo}-${data.noDocumento}`, fechaDocumento: data.fechaDocumento, periodoCerrado: toPeriodoNum(data.periodo) === 6 }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data.documento.codigo}-${data.noDocumento}` }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsx(Modal, { title: "Generar Nota de Cr\u00E9dito", open: modalNCCLIAbierto, onCancel: () => {
                    if (!generandoNCCLI) {
                        setModalNCCLIAbierto(false);
                        setFechaNC(dayjs());
                        setNcfNC('');
                    }
                }, footer: [
                    _jsx(Button, { onClick: () => {
                            if (!generandoNCCLI) {
                                setModalNCCLIAbierto(false);
                                setFechaNC(dayjs());
                                setNcfNC('');
                            }
                        }, disabled: generandoNCCLI, children: "Cancelar" }, "cancel"),
                    _jsx(Button, { type: "primary", loading: generandoNCCLI, onClick: () => handleGenerarNotaCredito(true), children: "Generar y Enviar a la DGII" }, "enviar"),
                    _jsx(Button, { loading: generandoNCCLI, onClick: () => handleGenerarNotaCredito(false), children: "Generar" }, "generar"),
                ], children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Text, { strong: true, children: "Fecha de la Nota de Cr\u00E9dito" }) }), _jsx(DatePicker, { value: fechaNC, onChange: (date) => setFechaNC(date), disabledDate: (current) => {
                                        if (!data?.fechaDocumento)
                                            return false;
                                        const facDate = dayjs(data.fechaDocumento);
                                        const today = dayjs();
                                        return current && (current.isBefore(facDate, 'day') || current.isAfter(today, 'day'));
                                    }, style: { width: '100%' }, format: "YYYY-MM-DD" })] }), _jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 4 }, children: [_jsx(Text, { strong: true, children: "NCF" }), _jsx(Text, { style: { fontSize: 12, color: '#999', marginLeft: 8 }, children: "(Opcional. Si se deja vac\u00EDo, se genera autom\u00E1ticamente)" })] }), _jsx(Input, { value: ncfNC, onChange: (e) => setNcfNC(e.target.value), placeholder: "E020000000001", style: { width: '100%' } })] })] }) })] }));
};
export default FacturaClienteDetalle;
