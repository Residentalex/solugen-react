import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Dropdown, Modal, DatePicker, Typography, Tooltip, Descriptions, Alert, App, Badge, Empty, Switch } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, LockFilled, FileTextOutlined, FileSearchOutlined, RollbackOutlined, ScanOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { transaccionApi } from '../../api/transaccionApi';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { parametrosApi } from '../../api/parametrosApi';
import { productoApi } from '../../api/productoApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import PermissionGate from '../../components/PermissionGate';
import DetalleToolbar from '../../components/DetalleToolbar';
import ErrorDetalle from '../../components/ErrorDetalle';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalFechaVencimiento from '../../components/ModalFechaVencimiento/ModalFechaVencimiento';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import { formatNumber, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import EscanerModal from '../../components/EscanerModal';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
const { Text } = Typography;
const DETALLE_COLUMNS_CONFIG = [
    { key: 'codigo', label: 'Código', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'costo', label: 'Costo', defaultVisible: true },
    { key: 'descuento', label: 'Descuento', defaultVisible: true },
    { key: 'impuestos', label: 'Impuestos', defaultVisible: true },
    { key: 'total', label: 'Total', defaultVisible: true },
    { key: 'subTotal', label: 'SubTotal', defaultVisible: false },
    { key: 'flete', label: 'Flete', defaultVisible: false },
    { key: 'cantidadBonificable', label: 'Cant. Bonificable', defaultVisible: false },
    { key: 'factor', label: 'Factor', defaultVisible: false },
    { key: 'tipoArticulo', label: 'Tipo Artículo', defaultVisible: false },
];
const DETALLE_DEFAULT_VISIBLE_KEYS = DETALLE_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_DETALLE_VISIBLE_COLUMNS_KEY = 'fenp_detalle_visibleColumns';
const EntradaAlmacenDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [detalleSearch, setDetalleSearch] = useState('');
    const [fechaVencimientoModal, setFechaVencimientoModal] = useState({ open: false, detalleId: 0 });
    const [tieneScan, setTieneScan] = useState(null);
    const [tienePagos, setTienePagos] = useState(false);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [escanerModalOpen, setEscanerModalOpen] = useState(false);
    const [ocDetallesData, setOcDetallesData] = useState([]);
    const [ocLoading, setOcLoading] = useState(false);
    const [devolucionesData, setDevolucionesData] = useState([]);
    const [facturaData, setFacturaData] = useState(null);
    const [documentosRelacionados, setDocumentosRelacionados] = React.useState([]);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const monedaDefault = getMonedaSucursalActiva();
    const [vencimientoPendientes, setVencimientoPendientes] = useState([]);
    const [vencimientoModalOpen, setVencimientoModalOpen] = useState(false);
    const [vencimientoFechas, setVencimientoFechas] = useState({});
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
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
    const sucursalContableRef = useRef(Sucursal.Consolidado);
    const { message, modal } = App.useApp();
    // Cargar detalles de la OC por separado cuando se tenga el id
    useEffect(() => {
        if (!data?.ordenCompra?.id)
            return;
        if (ocDetallesData.length > 0)
            return;
        setOcLoading(true);
        ordenCompraApi.obtenerPorId(Sucursal.Compra, data.ordenCompra.id)
            .then((oc) => {
            if (oc.detalles?.length)
                setOcDetallesData(oc.detalles);
        })
            .catch(() => message.warning('No se pudieron cargar los detalles de la OC'))
            .finally(() => setOcLoading(false));
    }, [data?.ordenCompra?.id]);
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
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setFacturaData(null);
        setLoadingError(false);
        entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            if (res.ordenCompra?.id) {
                ordenCompraApi.obtenerPorId(Sucursal.Compra, res.ordenCompra.id)
                    .then((oc) => setOcDetallesData(oc.detalles || []))
                    .catch((err) => { console.warn('Error al cargar detalles OC en detalle entrada', err); });
            }
            devolucionCompraApi.obtenerPorIdEntrada(sucursalActiva, parseInt(id))
                .then((dvcs) => setDevolucionesData(dvcs))
                .catch((err) => { console.warn('Error al cargar devoluciones en detalle entrada', err); });
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => message.warning('No se pudieron cargar los documentos relacionados'));
            // Cargar factura RDE si el concepto genera una
            if (res.concepto?.docAGenerar === 'RDE') {
                const sucursalRDE = res.concepto?.sucursalDestino?.sucursal ?? sucursalContableRef.current;
                facturaSuplidorApi.obtenerPorDocumento(sucursalRDE, res.noDocumento)
                    .then((factura) => setFacturaData(factura))
                    .catch((err) => { console.warn('Error al cargar factura RDE en detalle entrada', err); });
            }
            else {
                setFacturaData(null);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await entradaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
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
    const handleEscaner = () => {
        setEscanerModalOpen(true);
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
    const screens = Grid.useBreakpoint();
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    // ===== Detalles filtrados por búsqueda =====
    const detallesFiltrados = detalleSearch
        ? (documentoActivo?.detalles || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : (documentoActivo?.detalles || []);
    const { screenCode } = useScreenConfig('FENP');
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, screenCode]);
    useEffect(() => {
        if (!id)
            return;
        setFacturaData(null);
        setLoading(true);
        entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            if (res.ordenCompra?.id) {
                ordenCompraApi.obtenerPorId(Sucursal.Compra, res.ordenCompra.id)
                    .then((oc) => setOcDetallesData(oc.detalles || []))
                    .catch((err) => { console.warn('Error al cargar detalles OC en recarga detalle entrada', err); });
            }
            // Cargar devoluciones asociadas
            devolucionCompraApi.obtenerPorIdEntrada(sucursalActiva, parseInt(id))
                .then((dvcs) => setDevolucionesData(dvcs))
                .catch((err) => {
                const msg = err?.response?.data?.errorMessage || 'Error al cargar devoluciones';
                message.warning(msg);
            });
            // Cargar factura RDE si el concepto genera una
            if (res.concepto?.docAGenerar === 'RDE') {
                const sucursalRDE = res.concepto?.sucursalDestino?.sucursal ?? sucursalContableRef.current;
                facturaSuplidorApi.obtenerPorDocumento(sucursalRDE, res.noDocumento)
                    .then((factura) => setFacturaData(factura))
                    .catch(() => {
                    // Silencioso - puede no existir si la ENP no se ha posteado
                });
            }
            else {
                setFacturaData(null);
            }
            // Verificar si tiene factura escaneada
            entradaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar transacciones/pagos asociados
            transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
                .then((transacciones) => setTienePagos(transacciones.length > 0))
                .catch(() => setTienePagos(false));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Cargar sucursal contable desde PARAMETROS para búsqueda de RDE
    useEffect(() => {
        if (!sucursalActiva)
            return;
        parametrosApi.obtenerSucursalContable(sucursalActiva)
            .then(s => { if (s != null)
            sucursalContableRef.current = s; })
            .catch(() => { });
    }, [sucursalActiva]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'ENP'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'ENP'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    // Función lookup: para cada detalle de entrada, obtiene el total devuelto
    // Primero por idExterno (id del detalle de entrada), luego por codigo+costo
    const obtenerDevueltoPorDetalle = React.useMemo(() => {
        const porIdExterno = {};
        const porCodigoCosto = {};
        for (const dvc of devolucionesData) {
            if (!dvc.detalles)
                continue;
            for (const det of dvc.detalles) {
                const factor = Number(det.medida?.factor) || 1;
                const devuelto = Number(det.devuelto || 0) * factor;
                if (det.idExterno) {
                    porIdExterno[det.idExterno] = (porIdExterno[det.idExterno] || 0) + devuelto;
                }
                else {
                    const key = `${det.codigo || ''}`;
                    porCodigoCosto[key] = (porCodigoCosto[key] || 0) + devuelto;
                }
            }
        }
        return (entradaDetalle) => {
            // 1. Intentar por idExterno
            if (porIdExterno[entradaDetalle.id]) {
                return porIdExterno[entradaDetalle.id];
            }
            // 2. Fallback por codigo + costo
            const key = `${entradaDetalle.codigo || ''}`;
            return porCodigoCosto[key] || 0;
        };
    }, [devolucionesData]);
    const tienePermisoFDVC = React.useMemo(() => {
        const usuario = useAuthStore.getState().usuario;
        if (!usuario)
            return false;
        const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === 'FDVC');
        return pantalla?.acciones.includes('VISUALIZAR') ?? false;
    }, []);
    const tienePermisoFRDE = React.useMemo(() => {
        const usuario = useAuthStore.getState().usuario;
        if (!usuario)
            return false;
        const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === 'FRDE');
        return pantalla?.acciones.includes('VISUALIZAR') ?? false;
    }, []);
    const tienePermisoDESAPLICAR = React.useMemo(() => {
        const usuario = useAuthStore.getState().usuario;
        if (!usuario)
            return false;
        const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === 'FENP');
        return pantalla?.acciones.includes('DESAPLICAR') ?? false;
    }, []);
    const tieneDetalleConAumentoPrecio = React.useMemo(() => {
        return (data?.detalles || []).some((d) => (d.familia?.aumentoPrecioMaximo ?? 0) > 0);
    }, [data?.detalles]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FENP", onRecargar: handleRefresh });
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(documentoActivo.estado);
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    const detalleColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 100,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { children: record.codigo || '-' }), (() => {
                                const fechaVencida = record.fechaVencimiento ? new Date(record.fechaVencimiento) < new Date() : false;
                                const tieneCoincidencia = ocDetallesData.some((d) => d.codigo === record.codigo
                                    && (Math.abs(Number(d.costo) - Number(record.costo)) <= 1 || Number(record.cantidadBonificable) !== 0)
                                    && Number(d.medida?.factor || 1) === Number(record.medida?.factor || 1)
                                    && !d.nota?.trim());
                                const ocMatch = ocDetallesData.length > 0
                                    && (tieneCoincidencia || Number(record.cantidadBonificable) > 0)
                                    && (!record.tieneVencimiento || record.fechaVencimiento)
                                    && !fechaVencida;
                                if (ocDetallesData.length === 0)
                                    return null;
                                if (ocMatch) {
                                    return (_jsx(Tooltip, { title: "Coincide con OC", children: _jsx(CheckCircleOutlined, { style: { color: '#34c38f', fontSize: 12 } }) }));
                                }
                                let motivo = 'No coincide con la OC';
                                const detalleOC = ocDetallesData.find((d) => d.codigo === record.codigo);
                                if (!detalleOC) {
                                    motivo = 'Código no encontrado en la OC';
                                }
                                else if (record.tieneVencimiento && !record.fechaVencimiento) {
                                    motivo = 'Requiere fecha de vencimiento';
                                }
                                else if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date()) {
                                    motivo = 'Fecha de vencimiento vencida';
                                }
                                else if (detalleOC.nota?.trim()) {
                                    motivo = `OC tiene nota: ${detalleOC.nota}`;
                                }
                                else if (Number(detalleOC.medida?.factor || 1) !== Number(record.medida?.factor || 1)) {
                                    motivo = `Factor OC: ${detalleOC.medida?.factor || 1} | ENP: ${record.medida?.factor || 1}`;
                                }
                                else if (Number(record.cantidadBonificable) === 0 && Math.abs(Number(detalleOC.costo) - Number(record.costo)) > 1) {
                                    motivo = `Costo OC: ${formatNumber(detalleOC.costo)} | ENP: ${formatNumber(record.costo)}`;
                                }
                                return (_jsx(Tooltip, { title: motivo, children: _jsx(CloseCircleOutlined, { style: { color: '#d9d9d9', fontSize: 12 } }) }));
                            })()] }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center' }, children: _jsx("span", { style: { flex: 1 }, children: toTitleCase(record.articulo || '') }) }), _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }, children: [record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null, record.fechaVencimiento && _jsxs("span", { children: ["V: ", formatDate(record.fechaVencimiento)] })] })] })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => {
                const enpFactor = Number(record.medida?.factor) || 1;
                const totalEnBase = (record.cantidad || 0) * enpFactor;
                const totalDevuelto = obtenerDevueltoPorDetalle(record);
                const saldo = totalEnBase - totalDevuelto;
                const tieneDevolucion = totalDevuelto > 0;
                return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: tieneDevolucion ? (_jsxs("div", { children: [_jsx("span", { style: { textDecoration: 'line-through', color: '#ff4d4f', marginRight: 8 }, children: formatNumber(record.cantidad || 0) }), _jsx("span", { style: { color: '#34c38f', fontWeight: 600, fontSize: 13 }, children: formatNumber(saldo / enpFactor) })] })) : (_jsx("div", { children: formatNumber(record.cantidad || 0) })) }), _jsx(Tooltip, { title: record.medida?.nombre || '', children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, textAlign: 'right', marginTop: 'auto', minHeight: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: record.medida?.nombre || '' }) })] }));
            },
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
                return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { children: formatNumber(costoBase) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { children: [formatNumber(record.porcentajeDescuento || 0), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }, children: formatNumber(record.descuento || 0) })] })),
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
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Text, { strong: true, children: formatNumber(record.total || 0) }), _jsx("div", { style: { fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }, children: "\u00A0" })] })),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx("div", { children: formatNumber(record.subTotal || 0) })),
        },
        {
            title: 'Flete',
            dataIndex: 'flete',
            key: 'flete',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx("div", { children: formatNumber(record.flete || 0) })),
        },
        {
            title: 'Cant. Bonificable',
            dataIndex: 'cantidadBonificable',
            key: 'cantidadBonificable',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx("div", { children: formatNumber(record.cantidadBonificable || 0) })),
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
        {
            title: 'Tipo Artículo',
            dataIndex: 'tipoArticulo',
            key: 'tipoArticulo',
            width: 110,
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (val) => _jsx(Text, { children: val || '' }),
        },
    ];
    const detalleColumnsFiltered = detalleColumns.filter((col) => col.key === 'codigo' || visibleDetalleKeys.includes(col.key));
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleDesaplicarConfirm = async (motivo) => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await entradaAlmacenApi.desaplicar(sucursalActiva, documento);
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
    const handleAplicar = async () => {
        if (!id)
            return;
        // Verificación del scanner en tiempo real (solo obligatorio si tiene Orden de Compra)
        if (data?.ordenCompra?.noDocumento) {
            try {
                const scanActual = await entradaAlmacenApi.verificarScan(sucursalActiva, parseInt(id));
                setTieneScan(scanActual.existe);
                if (!scanActual.existe) {
                    message.warning('Debe escanear la factura antes de aplicar.');
                    return;
                }
            }
            catch (err) {
                const msg = extraerMensajeError(err, 'Error al verificar factura escaneada. Intente nuevamente.');
                message.warning(msg);
                return;
            }
        }
        // Si el usuario tiene permiso DESAPLICAR y hay detalles con aumento configurado,
        // mostrar confirmación antes de aplicar
        if (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio) {
            const confirmed = await new Promise((resolve) => {
                modal.confirm({
                    title: 'Advertencia de sobreprecio',
                    icon: _jsx(ExclamationCircleOutlined, {}),
                    content: 'Hay productos cuyo costo podría superar el porcentaje de aumento máximo permitido de su familia. ¿Desea continuar aplicando?',
                    okText: 'Sí, aplicar',
                    cancelText: 'No, cancelar',
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            });
            if (!confirmed)
                return;
            // La ejecución continúa al final tras validación de vencimiento
        }
        // ===== Validar fechas de vencimiento (solo si tiene OrdenCompra) =====
        if (data?.ordenCompra?.noDocumento && documentoActivo.detalles?.length) {
            try {
                const codigos = data.detalles.map((d) => d.codigo).filter(Boolean);
                const codigosConVencimiento = await productoApi.obtenerProductosVencimiento(Sucursal.Compra, codigos);
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
        // Flujo normal (sin bloqueos)
        setOperacionTitulo(`Aplicando ENP-${data?.noDocumento || id}`);
        const confirmarSP = (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio);
        operacion.ejecutar(`/ENP/${sucursalActiva}/aplicar/${id}${confirmarSP ? '?confirmarSobrePrecio=true' : ''}`, handleRefresh);
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
        // Continuar con la aplicación (disparar el operacion.ejecutar)
        setOperacionTitulo(`Aplicando ENP-${data?.noDocumento || id}`);
        const confirmarSP = (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio);
        operacion.ejecutar(`/ENP/${sucursalActiva}/aplicar/${id}${confirmarSP ? '?confirmarSobrePrecio=true' : ''}`, handleRefresh);
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
            const destinoContable = data?.concepto?.sucursalDestino?.sucursal ?? sucursalContableRef.current;
            await entradaAlmacenApi.anular(sucursalActiva, dto, destinoContable);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
        // Seguridad: si no está en estado Aplicado (Validado=1), aplicar primero (como en desktop)
        if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
            message.info('Debe aplicar el documento antes de postear.');
            return;
        }
        setOperacionTitulo(`Posteando ENP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/ENP/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await entradaAlmacenApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await entradaAlmacenApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de entrada de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: screenCode, estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('ENP', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            message.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const res = await apiClient.post('/reportes/inventario/entrada', { ...data, facturaAsociada: facturaData }, {
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
                }, onEditar: () => navigate(`/FENP/${id}/editar`), onAplicar: handleAplicar, onAnular: tienePagos ? undefined : async () => setModalAnularOpen(true), onPostear: documentoActivo.concepto?.noAsientos ? undefined : handlePostear, onRevisado: handleRevisado, onDesaplicar: tienePagos ? undefined : async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), toEstadoNum(documentoActivo.estado) === 1 ? (_jsx(PermissionGate, { codigoPantalla: "FDVC", accion: "CREAR", children: _jsx(Button, { icon: _jsx(RollbackOutlined, {}), onClick: () => navigate('/FDVC/nuevo', { state: { entradaId: data?.id } }), children: "Devolver" }) })) : undefined] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsxs(_Fragment, { children: [_jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }), _jsx(Tooltip, { title: "Escanear factura", children: _jsx(Button, { type: "dashed", size: "small", icon: _jsx(ScanOutlined, {}), onClick: (e) => { e.stopPropagation(); handleEscaner(); }, children: "Escanear" }) })] }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Orden Compra:", children: documentoActivo.ordenCompra?.noDocumento || '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : toTitleCase(documentoActivo.concepto?.nombre || '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Suplidor:", children: toTitleCase(documentoActivo.suplidor?.nombre || documentoActivo.entidad?.nombre || '-') }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Fecha Recibo:", children: documentoActivo.fechaEntrega ? formatDate(documentoActivo.fechaEntrega) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: toTitleCase(documentoActivo.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                                setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1200 } })),
                                    },
                                    ...(devolucionesData.length > 0 ? [{
                                            key: 'devoluciones',
                                            label: (_jsxs("span", { children: ["Devoluciones", _jsx(Badge, { count: devolucionesData.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } })] })),
                                            children: (_jsx(Table, { dataSource: devolucionesData, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, rowClassName: (record) => toEstadoNum(record.estado) === 3 ? 'paces-row-anulado' : '', columns: [
                                                    {
                                                        title: 'Documento',
                                                        key: 'documento',
                                                        width: 130,
                                                        render: (_, record) => (tienePermisoFDVC ? (_jsxs("a", { className: "paces-doc-link", onClick: () => navigate(`/FDVC/${record.id}`), style: { cursor: 'pointer' }, children: ["DVC-", record.noDocumento] })) : (_jsxs("span", { children: ["DVC-", record.noDocumento] }))),
                                                    },
                                                    {
                                                        title: 'Fecha',
                                                        key: 'fecha',
                                                        width: 110,
                                                        render: (_, record) => formatDate(record.fechaDocumento),
                                                    },
                                                    {
                                                        title: 'Suplidor',
                                                        key: 'suplidor',
                                                        responsive: ['md', 'lg', 'xl', 'xxl'],
                                                        render: (_, record) => toTitleCase(record.suplidor?.nombre || record.entidad?.nombre || ''),
                                                    },
                                                    {
                                                        title: 'Total',
                                                        key: 'total',
                                                        width: 120,
                                                        align: 'right',
                                                        render: (_, record) => (_jsx(Typography.Text, { strong: true, children: formatNumber(record.total || 0) })),
                                                    },
                                                    {
                                                        title: 'Estado',
                                                        key: 'estado',
                                                        width: 110,
                                                        render: (_, record) => {
                                                            const info = resolveEstado(record.estado);
                                                            return _jsx(Tag, { color: info.color, children: info.label });
                                                        },
                                                    },
                                                ] })),
                                        }] : []),
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
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.suplidor, entidadSecundaria: documentoActivo.entidad, fallbackTitulo: "Suplidor" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && (_jsxs(_Fragment, { children: [_jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" }), _jsx(Tooltip, { title: "Escanear factura", children: _jsx(Button, { type: "dashed", size: "small", icon: _jsx(ScanOutlined, {}), onClick: (e) => { e.stopPropagation(); handleEscaner(); }, children: "Escanear" }) })] }))] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Orden Compra:", children: documentoActivo.ordenCompra?.noDocumento || '-' }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : toTitleCase(documentoActivo.concepto?.nombre || '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-' }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Suplidor:", children: toTitleCase(documentoActivo.suplidor?.nombre || documentoActivo.entidad?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Fecha Recibo:", children: documentoActivo.fechaEntrega ? formatDate(documentoActivo.fechaEntrega) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n:", children: toTitleCase(documentoActivo.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Nota:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1200 } })),
                            },
                            {
                                key: 'devoluciones',
                                label: (_jsxs("span", { children: ["Devoluciones", devolucionesData.length > 0 && (_jsx(Badge, { count: devolucionesData.length, style: { marginLeft: 6, backgroundColor: '#556ee6' } }))] })),
                                children: devolucionesData.length === 0 ? (_jsx(Empty, { image: _jsx(RollbackOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: "Sin devoluciones registradas" })) : (_jsx(Table, { dataSource: devolucionesData, rowKey: "id", size: "small", pagination: false, scroll: { x: 600 }, rowClassName: (record) => toEstadoNum(record.estado) === 3 ? 'paces-row-anulado' : '', columns: [
                                        {
                                            title: 'Documento',
                                            key: 'documento',
                                            width: 130,
                                            render: (_, record) => (tienePermisoFDVC ? (_jsxs("a", { className: "paces-doc-link", onClick: () => navigate(`/FDVC/${record.id}`), style: { cursor: 'pointer' }, children: ["DVC-", record.noDocumento] })) : (_jsxs("span", { children: ["DVC-", record.noDocumento] }))),
                                        },
                                        {
                                            title: 'Fecha',
                                            key: 'fecha',
                                            width: 110,
                                            render: (_, record) => formatDate(record.fechaDocumento),
                                        },
                                        {
                                            title: 'Suplidor',
                                            key: 'suplidor',
                                            responsive: ['md', 'lg', 'xl', 'xxl'],
                                            render: (_, record) => toTitleCase(record.suplidor?.nombre || record.entidad?.nombre || ''),
                                        },
                                        {
                                            title: 'Total',
                                            key: 'total',
                                            width: 120,
                                            align: 'right',
                                            render: (_, record) => (_jsx(Typography.Text, { strong: true, children: formatNumber(record.total || 0) })),
                                        },
                                        {
                                            title: 'Estado',
                                            key: 'estado',
                                            width: 110,
                                            render: (_, record) => {
                                                const info = resolveEstado(record.estado);
                                                return _jsx(Tag, { color: info.color, children: info.label });
                                            },
                                        },
                                    ] })),
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
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalFechaVencimiento, { open: fechaVencimientoModal.open, onClose: () => setFechaVencimientoModal({ open: false, detalleId: 0 }), onFechaChange: handleFechaVencimiento }), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Documento Escaneado", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data.documento.codigo}-${data.noDocumento}` }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento.codigo}-${data.noDocumento}`, fechaDocumento: data.fechaDocumento, periodoCerrado: toPeriodoNum(data.periodo) === 6 }), _jsxs(Modal, { title: "Fechas de Vencimiento Requeridas", open: vencimientoModalOpen, onCancel: () => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }, width: 520, destroyOnHidden: true, maskClosable: false, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: () => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }, children: "Cancelar" }), _jsx(Button, { type: "primary", disabled: vencimientoPendientes.some((p) => !vencimientoFechas[p.id]), onClick: handleVencimientoConfirm, children: "Aplicar" })] }), children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsx(Text, { children: "Los siguientes productos requieren fecha de vencimiento:" }) }), vencimientoPendientes.map((p) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 13 }, children: p.codigo }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: p.articulo })] }), _jsx(DatePicker, { style: { width: 160 }, format: "YYYY-MM-DD", value: vencimientoFechas[p.id] || null, onChange: (date) => {
                                    setVencimientoFechas((prev) => ({
                                        ...prev,
                                        [p.id]: date || undefined,
                                    }));
                                }, disabledDate: (current) => current && current.isBefore(dayjs(), 'day') })] }, p.id)))] }), _jsx(EscanerModal, { open: escanerModalOpen, onClose: () => setEscanerModalOpen(false), onScanned: () => {
                    handleRefresh();
                }, filePath: `${data.documento.codigo}-${data.noDocumento}.pdf` }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default EntradaAlmacenDetalle;
