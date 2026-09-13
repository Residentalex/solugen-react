import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Typography, Tooltip, Alert, Modal, App, Switch, } from 'antd';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { transaccionApi } from '../../api/transaccionApi';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import DistribucionPagosCard from '../../components/DistribucionPagosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import SucursalField from '../../components/SucursalField';
const { Text } = Typography;
const DETALLE_COLUMNS_CONFIG = [
    { key: 'codigo', label: 'Código', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'costo', label: 'Costo', defaultVisible: true },
    { key: 'descuento', label: 'Descuento', defaultVisible: true },
    { key: 'subTotal', label: 'SubTotal', defaultVisible: false },
    { key: 'impuestos', label: 'Impuestos', defaultVisible: true },
    { key: 'total', label: 'Total', defaultVisible: true },
    { key: 'factor', label: 'Factor', defaultVisible: false },
];
const DETALLE_DEFAULT_VISIBLE_KEYS = DETALLE_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_DETALLE_VISIBLE_COLUMNS_KEY = 'dvc_detalle_visibleColumns';
const DevolucionCompraDetalle = () => {
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
    const screens = Grid.useBreakpoint();
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [pagosAsociados, setPagosAsociados] = useState([]);
    const [loadingPagos, setLoadingPagos] = useState(false);
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
    const { message: messageApi } = App.useApp();
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                messageApi.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            // Si el concepto es NoImpuesto, solo limpiar impuestos, NO modificar Total
            if (res.concepto?.noImpuesto && res.detalles) {
                res.detalles = res.detalles.map((d) => ({
                    ...d,
                    impuestos: 0,
                }));
                res.impuestos = 0;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                devolucionCompraApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Verificar si tiene documento escaneado
            devolucionCompraApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            messageApi.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'DVC'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'DVC'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    // Cargar documentos relacionados desde DOCUMENTOS_RELACION
    useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
            messageApi.warning('No se pudieron cargar los documentos relacionados');
        });
    }, [data?.id, sucursalActiva]);
    // Cargar pagos asociados
    useEffect(() => {
        if (!data?.id)
            return;
        setLoadingPagos(true);
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
            .then((transacciones) => setPagosAsociados(transacciones || []))
            .catch(() => {
            setPagosAsociados([]);
            messageApi.warning('No se pudieron cargar los pagos asociados');
        })
            .finally(() => setLoadingPagos(false));
    }, [data?.id, sucursalActiva]);
    const handleDocumentoPagoClick = (doc) => {
        const tipo = (doc.tipoDocumento || '').toUpperCase();
        if (tipo === 'ND' && doc.id) {
            navigate(`/FNDSUP/${doc.id}`);
        }
        else if (doc.id) {
            navigate(`/FTRN/${doc.id}`);
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
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                messageApi.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            // Si el concepto es NoImpuesto, solo limpiar impuestos, NO modificar Total
            if (res.concepto?.noImpuesto && res.detalles) {
                res.detalles = res.detalles.map((d) => ({
                    ...d,
                    impuestos: 0,
                }));
                res.impuestos = 0;
            }
            setData(res);
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (res.estado === 3 && res.reversoID) {
                devolucionCompraApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            messageApi.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await devolucionCompraApi.descargarScan(sucursalActiva, parseInt(id));
            const url = URL.createObjectURL(blob);
            setScannerUrl(url);
            setScannerModalOpen(true);
        }
        catch {
            messageApi.error('Error al cargar el archivo escaneado');
        }
        finally {
            setScannerLoading(false);
        }
    };
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FDVC", onRecargar: handleRefresh });
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(documentoActivo.estado);
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    const tienePagos = pagosAsociados.length > 0;
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
    const handleAplicar = () => {
        if (!id)
            return;
        // Verificación temprana del scanner
        if (tieneScan === false) {
            messageApi.warning('Debe escanear el documento antes de aplicar.');
            return;
        }
        setOperacionTitulo(`Aplicando DVC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/DVC/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleDesaplicarConfirm = async (motivo) => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await devolucionCompraApi.desaplicar(sucursalActiva, documento);
            messageApi.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
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
            await devolucionCompraApi.anular(sucursalActiva, dto);
            messageApi.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await devolucionCompraApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
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
        if (data.concepto?.noAsientos) {
            messageApi.info('El concepto no genera asientos contables.');
            return;
        }
        // Seguridad: si no está en estado Aplicado (Validado=1), aplicar primero (como en desktop)
        if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
            messageApi.info('Debe aplicar el documento antes de postear.');
            return;
        }
        setOperacionTitulo(`Posteando DVC-${data?.noDocumento || id}`);
        operacion.ejecutar(`/DVC/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisar = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await devolucionCompraApi.revisado(sucursalActiva, parseInt(id));
            messageApi.success('Documento marcado como revisado');
            const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await devolucionCompraApi.reversar(sucursalActiva, parseInt(id));
            messageApi.success('Documento reversado exitosamente');
            const res = await devolucionCompraApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await devolucionCompraApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al reversar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de devoluci\u00F3n de compra", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), (() => {
                const enpRel = documentosRelacionados.find(r => r.origenTipoDoc === 'ENP' || r.destinoTipoDoc === 'ENP');
                if (!enpRel)
                    return null;
                const esOrigen = enpRel.origenTipoDoc === 'ENP';
                const enpId = esOrigen ? enpRel.idOrigen : enpRel.idDestino;
                const enpDoc = esOrigen ? enpRel.origenNumDoc : enpRel.destinoNumDoc;
                return (_jsx(Card, { size: "small", style: { borderRadius: 8, marginBottom: 16, background: '#fafafa', cursor: 'pointer' }, hoverable: true, onClick: () => navigate(`/FENP/${enpId}`), children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 13, color: '#262626' }, children: "Entrada Asociada" }), _jsxs(Tag, { color: "blue", style: { fontSize: 12 }, children: ["ENP-", enpDoc] })] }) }));
            })(), _jsx(DetalleToolbar, { modulo: "FDVC", estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('DVC', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            messageApi.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const res = await apiClient.post('/reportes/inventario/devolucion-compra', data, {
                            responseType: 'blob',
                        });
                        const blobUrl = URL.createObjectURL(res.data);
                        window.open(blobUrl, '_blank');
                    }
                    catch (err) {
                        try {
                            const blob = err?.response?.data;
                            const text = blob instanceof Blob ? await blob.text() : '';
                            const json = JSON.parse(text);
                            messageApi.error(json.errorMessage || 'Error al generar el PDF');
                        }
                        catch {
                            messageApi.error(err?.message || 'Error al generar el PDF');
                        }
                    }
                    finally {
                        setImprimiendo(false);
                    }
                }, onEditar: () => navigate(`/FDVC/${id}/editar`), onAplicar: handleAplicar, onAnular: tienePagos ? undefined : async () => setModalAnularOpen(true), onPostear: documentoActivo.concepto?.noAsientos ? undefined : handlePostear, onRevisado: handleRevisar, onDesaplicar: tienePagos ? undefined : async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsx(_Fragment, { children: toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })) })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsx(Tooltip, { title: "Documento no escaneado", children: _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }) }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", span: 2, children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1200 } })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.suplidor, entidadSecundaria: documentoActivo.entidad, fallbackTitulo: "Suplidor" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DistribucionPagosCard, { documentos: pagosAsociados, totalDocumento: documentoActivo.total, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, loading: loadingPagos, onDocumentoClick: handleDocumentoPagoClick }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsx(Tooltip, { title: "Documento no escaneado", children: _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }) }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1200 } })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DistribucionPagosCard, { documentos: pagosAsociados, totalDocumento: documentoActivo.total, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, loading: loadingPagos, onDocumentoClick: handleDocumentoPagoClick }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento.codigo}-${data.noDocumento}`, fechaDocumento: data.fechaDocumento, periodoCerrado: toPeriodoNum(data.periodo) === 6 }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data.documento.codigo}-${data.noDocumento}` }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsx(Modal, { title: "Documento Escaneado", open: scannerModalOpen, onCancel: () => { setScannerModalOpen(false); if (scannerUrl)
                    URL.revokeObjectURL(scannerUrl); setScannerUrl(null); }, width: "80%", style: { top: 20 }, footer: null, destroyOnHidden: true, children: scannerLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : scannerUrl ? (_jsx("iframe", { src: scannerUrl, style: { width: '100%', height: '70vh', border: 'none' }, title: "Scanner" })) : (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) })] }));
};
export default DevolucionCompraDetalle;
