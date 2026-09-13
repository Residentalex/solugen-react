import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Input, Typography, Tooltip, Modal, Alert, App, DatePicker, Dropdown, Switch, } from 'antd';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import dayjs from 'dayjs';
import { LockFilled, CheckCircleFilled, CheckCircleOutlined, CalendarOutlined, MoreOutlined, PrinterOutlined, FileTextOutlined, FileSearchOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import ErrorDetalle from '../../components/ErrorDetalle';
import PermissionGate from '../../components/PermissionGate';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import SucursalField from '../../components/SucursalField';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { productoApi } from '../../api/productoApi';
import { transaccionApi } from '../../api/transaccionApi';
const { Text } = Typography;
const DETALLE_COLUMNS_CONFIG = [
    { key: 'codigo', label: 'Código', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'costo', label: 'Costo', defaultVisible: true },
    { key: 'descuento', label: 'Descuento', defaultVisible: true },
    { key: 'impuestos', label: 'Impuestos', defaultVisible: true },
    { key: 'total', label: 'Total', defaultVisible: true },
    { key: 'factor', label: 'Factor', defaultVisible: false },
];
const DETALLE_DEFAULT_VISIBLE_KEYS = DETALLE_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_DETALLE_VISIBLE_COLUMNS_KEY = 'sap_detalle_visibleColumns';
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
const SalidaAlmacenDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig('FSAP');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [tieneScan, setTieneScan] = useState(null);
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = React.useState([]);
    const [verificados, setVerificados] = useState(new Set());
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const [vencimientoPendientes, setVencimientoPendientes] = useState([]);
    const [vencimientoModalOpen, setVencimientoModalOpen] = useState(false);
    const [vencimientoFechas, setVencimientoFechas] = useState({});
    const monedaDefault = getMonedaSucursalActiva();
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
    const { message } = App.useApp();
    const operacion = useAplicar();
    const screens = Grid.useBreakpoint();
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Recargar documentos relacionados
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => message.warning('No se pudieron cargar los documentos relacionados'));
            salidaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Verificar si tiene documento escaneado
            salidaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'SAP'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'SAP'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    // Cargar documentos relacionados desde DOCUMENTOS_RELACION
    React.useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
            message.warning('No se pudieron cargar los documentos relacionados');
        });
    }, [data?.id, sucursalActiva]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await salidaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
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
    const handleFechaVencimiento = (date) => {
        if (fechaVencimientoModal.detalleId) {
            setData((prev) => {
                if (!prev)
                    return prev;
                return {
                    ...prev,
                    detalles: prev.detalles.map((d) => {
                        if (d.id !== fechaVencimientoModal.detalleId)
                            return d;
                        return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
                    }),
                };
            });
        }
        setFechaVencimientoModal({ open: false, detalleId: 0 });
    };
    const handleToggleVerificar = (id) => {
        setVerificados((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    };
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FSAP", onRecargar: handleRefresh });
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(documentoActivo.estado);
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
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
            render: (_, record) => {
                const verificado = verificados.has(record.id);
                return (_jsxs("div", { style: { fontSize: 13 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { children: record.codigo || '-' }), verificado ? (_jsx(CheckCircleFilled, { style: { color: '#4fc3f7', fontSize: 14 } })) : null] }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] }));
            },
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
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: formatNumber(record.cantidad || 0) }), _jsx(Tooltip, { title: record.medida?.nombre || '', children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', marginTop: 'auto', minHeight: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida?.nombre || '' }) })] })),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 110,
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
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsxs("div", { children: [formatNumber(record.porcentajeDescuento || 0), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 2 }, children: formatNumber(record.descuento || 0) })] })),
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
    // ===== Asientos e Historial =====
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleAplicar = async () => {
        if (!id)
            return;
        // Verificación temprana del scanner (solo obligatorio si no genera documento derivado)
        if (tieneScan === false && !data?.concepto?.docAGenerar) {
            message.warning('Debe escanear el documento antes de aplicar.');
            return;
        }
        // ===== Validar fechas de vencimiento (solo si el concepto tiene sucursalDestino) =====
        if (data?.concepto?.sucursalDestino && data.detalles?.length) {
            try {
                const codigos = data.detalles.map((d) => d.codigo).filter(Boolean);
                const codigosConVencimiento = await productoApi.obtenerProductosVencimiento(sucursalActiva, codigos);
                if (codigosConVencimiento.length > 0) {
                    // Filtrar detalles que tienen vencimiento pero no tienen fecha
                    const pendientes = data.detalles
                        .filter((d) => codigosConVencimiento.includes(d.codigo) && !d.fechaVencimiento)
                        .map((d) => ({ id: d.id, codigo: d.codigo, articulo: d.articulo }));
                    if (pendientes.length > 0) {
                        setVencimientoPendientes(pendientes);
                        setVencimientoFechas({});
                        setVencimientoModalOpen(true);
                        return; // Esperar a que el usuario complete las fechas
                    }
                }
            }
            catch (err) {
                const msg = err?.response?.data?.errorMessage || 'Error al validar fechas de vencimiento';
                message.warning(msg);
                // No bloquear la aplicación si falla la consulta de vencimiento
            }
        }
        setOperacionTitulo(`Aplicando SAP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/SAP/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleVencimientoConfirm = () => {
        // Actualizar las fechas en los detalles
        setData((prev) => {
            if (!prev)
                return prev;
            return {
                ...prev,
                detalles: prev.detalles.map((d) => {
                    const fecha = vencimientoFechas[d.id];
                    if (!fecha)
                        return d;
                    return { ...d, fechaVencimiento: fecha.format('YYYY-MM-DD') };
                }),
            };
        });
        setVencimientoModalOpen(false);
        setVencimientoPendientes([]);
        setVencimientoFechas({});
        // Continuar con la aplicación
        setOperacionTitulo(`Aplicando SAP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/SAP/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleDesaplicarConfirm = async (motivo) => {
        if (!id || !data)
            return;
        try {
            const documento = `${data.documento.codigo || ''}-${data.noDocumento || ''}`;
            await salidaAlmacenApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            message.error(msg);
            throw err; // Re-lanzar para que el modal no se cierre en error
        }
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data || !id)
            return;
        try {
            // Incluir motivo en el payload de anulación
            const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
            await salidaAlmacenApi.anular(sucursalActiva, payload);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await transaccionApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            message.error(msg);
            throw err; // Re-lanzar para que el modal no se cierre en error
        }
    };
    const handlePostear = () => {
        if (!data)
            return;
        setOperacionTitulo(`Posteando SAP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/SAP/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await salidaAlmacenApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await salidaAlmacenApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await salidaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await transaccionApi.obtenerPorId(sucursalActiva, res.reversoID);
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
    const imprimirConFormato = async (formato) => {
        setImprimiendo(true);
        try {
            try {
                await documentoImpresionApi.marcarImpreso('SAP', sucursalActiva, parseInt(id));
            }
            catch (errImprimir) {
                message.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                return;
            }
            const res = await apiClient.post(`/reportes/inventario/salida?formato=${formato}`, data, {
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
    };
    const printMenuItems = [
        { key: 'consumo', label: 'Salida por Consumo' },
        { key: 'decomiso', label: 'Salida por Decomiso' },
    ];
    const handlePrintMenuClick = ({ key }) => {
        imprimirConFormato(key);
    };
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de salida de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FSAP", estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), showImprimir: false, onEditar: () => navigate(`/FSAP/${id}/editar`), confirmActions: true, onAplicar: handleAplicar, onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), documentoActivo?.concepto?.sucursalDestino?.codigo ? (_jsx(PermissionGate, { accion: "IMPRIMIR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo, onClick: () => imprimirConFormato('general') }) })) : (_jsx(PermissionGate, { accion: "IMPRIMIR", children: _jsx(Dropdown, { menu: { items: printMenuItems, onClick: handlePrintMenuClick }, trigger: ['click'], children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo }) }) }))] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsx(Tooltip, { title: "Documento no escaneado", children: _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }) }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento Generado:", children: documentoActivo.documento?.codigo ? `${documentoActivo.documento.codigo}-${documentoActivo.noDocumento}` : '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Entidad:", children: documentoActivo.suplidor?.nombre ? toTitleCase(documentoActivo.suplidor.nombre) : (documentoActivo.entidad?.nombre ? toTitleCase(documentoActivo.entidad.nombre) : '-') }), _jsx(Descriptions.Item, { label: "Referencia:", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Fecha Entrega:", children: documentoActivo.fechaRecibo ? formatDate(documentoActivo.fechaRecibo) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1000 } })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 800 } })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 800 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.suplidor, entidadSecundaria: documentoActivo.entidad, fallbackTitulo: "Suplidor" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsx(Tooltip, { title: "Documento no escaneado", children: _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }) }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento Generado:", children: documentoActivo.documento?.codigo ? `${documentoActivo.documento.codigo}-${documentoActivo.noDocumento}` : '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Entidad:", children: documentoActivo.suplidor?.nombre ? toTitleCase(documentoActivo.suplidor.nombre) : (documentoActivo.entidad?.nombre ? toTitleCase(documentoActivo.entidad.nombre) : '-') }), _jsx(Descriptions.Item, { label: "Referencia:", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Fecha Entrega:", children: documentoActivo.fechaRecibo ? formatDate(documentoActivo.fechaRecibo) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1000 } })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 800 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 800 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: data ? `${data.documento.codigo}-${data.noDocumento}` : undefined, loading: saving }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: data ? `${data.documento.codigo}-${data.noDocumento}` : '', fechaDocumento: data?.fechaDocumento || '', periodoCerrado: toPeriodoNum(data?.periodo) === 6 }), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento }), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Documento Escaneado", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsxs(Modal, { title: "Fechas de Vencimiento Requeridas", open: vencimientoModalOpen, onCancel: () => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }, width: 520, destroyOnHidden: true, maskClosable: false, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: () => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }, children: "Cancelar" }), _jsx(Button, { type: "primary", disabled: vencimientoPendientes.some((p) => !vencimientoFechas[p.id]), onClick: handleVencimientoConfirm, children: "Aplicar" })] }), children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsx(Text, { children: "Los siguientes productos requieren fecha de vencimiento:" }) }), vencimientoPendientes.map((p) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 13 }, children: p.codigo }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: p.articulo })] }), _jsx(DatePicker, { style: { width: 160 }, format: "YYYY-MM-DD", value: vencimientoFechas[p.id] || null, onChange: (date) => {
                                    setVencimientoFechas((prev) => ({
                                        ...prev,
                                        [p.id]: date || undefined,
                                    }));
                                }, disabledDate: (current) => current && current.isBefore(dayjs(), 'day') })] }, p.id)))] }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default SalidaAlmacenDetalle;
