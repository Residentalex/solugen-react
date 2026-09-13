import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Divider, Input, Typography, Tooltip, Modal, Alert, App, Switch } from 'antd';
import ColumnVisibilityToggle from '../../components/ColumnVisibilityToggle';
import { LockFilled, FileTextOutlined, FileSearchOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
const { Text } = Typography;
const DETALLE_COLUMNS_CONFIG = [
    { key: 'codigo', label: 'Código', defaultVisible: true },
    { key: 'articulo', label: 'Artículo', defaultVisible: true },
    { key: 'cantidad', label: 'Cantidad', defaultVisible: true },
    { key: 'factor', label: 'Factor', defaultVisible: false },
];
const DETALLE_DEFAULT_VISIBLE_KEYS = DETALLE_COLUMNS_CONFIG
    .filter((c) => c.defaultVisible !== false)
    .map((c) => c.key);
const LS_DETALLE_VISIBLE_COLUMNS_KEY = 'tsa_detalle_visibleColumns';
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
const TransferenciaAlmacenDetalle = () => {
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
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
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
    const { message: messageApi } = App.useApp();
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transferenciaAlmacenApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Verificar si tiene documento escaneado
            transferenciaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            messageApi.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'TRP'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'TRP'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            setData(res);
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (res.estado === 3 && res.reversoID) {
                transferenciaAlmacenApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
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
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await transferenciaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
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
    // Cargar documentos relacionados desde DOCUMENTOS_RELACION
    useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
            messageApi.warning('No se pudieron cargar los documentos relacionados');
        });
    }, [data?.id]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FALM", onRecargar: handleRefresh });
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const estadoInfo = resolveEstado(documentoActivo.estado);
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
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
        // TRP - transferencia no requiere scanner check
        setOperacionTitulo(`Aplicando TRP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/TRP/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleDesaplicarConfirm = async (motivo) => {
        if (!id || !data)
            return;
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await transferenciaAlmacenApi.desaplicar(sucursalActiva, documento);
            messageApi.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            messageApi.error(msg);
            throw err; // Re-lanzar para que el modal no se cierre en error
        }
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data || !id)
            return;
        try {
            const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
            await transferenciaAlmacenApi.anular(sucursalActiva, payload);
            messageApi.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            messageApi.error(msg);
            throw err;
        }
    };
    const handlePostear = () => {
        if (!data)
            return;
        setOperacionTitulo(`Posteando TRP-${data?.noDocumento || id}`);
        operacion.ejecutar(`/TRP/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await transferenciaAlmacenApi.revisado(sucursalActiva, parseInt(id));
            messageApi.success('Documento marcado como revisado');
            const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await transferenciaAlmacenApi.reversar(sucursalActiva, parseInt(id));
            messageApi.success('Documento reversado exitosamente');
            const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (res.estado === 3 && res.reversoID) {
                const revRes = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, res.reversoID);
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
    // ===== Datos Generales card (compartido desktop/mobile) =====
    const renderDatosGenerales = (columnCount) => (_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver documento escaneado", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: columnCount, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha Doc.:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo?.nombre || documentoActivo.codigoTipo || '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n Origen:", children: documentoActivo.almacen?.nombre ? toTitleCase(documentoActivo.almacen.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n Destino:", children: documentoActivo.almacenDestino?.nombre ? toTitleCase(documentoActivo.almacenDestino.nombre) : '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Nota:", span: columnCount, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }));
    // ===== Tabs (compartido desktop/mobile) =====
    const renderTabs = () => (_jsx(Tabs, { defaultActiveKey: "detalles", type: "card", tabBarExtraContent: _jsxs(Space, { children: [_jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                        setDetalleSearch(''); } }), _jsx(ColumnVisibilityToggle, { columns: DETALLE_COLUMNS_CONFIG, visibleKeys: visibleDetalleKeys, onChange: setVisibleDetalleKeys, iconOnly: true })] }), items: [
            {
                key: 'detalles',
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo.detalles?.length || 0}` : ''})`,
                children: (_jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumnsFiltered, rowKey: "id", size: "small", pagination: false, scroll: { x: 1000 } })),
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
        ] }));
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de transferencia de almac\u00E9n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FTRP", estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('TRP', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            messageApi.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const sucursalParam = documentoActivo.codigoSucursal
                            ? obtenerNombreEnumSucursal(documentoActivo.codigoSucursal)
                            : sucursalActiva;
                        const res = await apiClient.post('/reportes/inventario/transferencia', data, {
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
                }, onEditar: () => navigate(`/FTRP/${id}/editar`), onAplicar: handleAplicar, confirmActions: false, onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsx(_Fragment, { children: toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })) })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), _jsxs("div", { children: [renderDatosGenerales(3), renderTabs(), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] }), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Documento Escaneado", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data?.documento?.codigo || 'TRP'}-${data?.noDocumento || id}`, loading: saving }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data?.documento?.codigo || 'TRP'}-${data?.noDocumento || ''}`, fechaDocumento: data?.fechaDocumento || '', periodoCerrado: toPeriodoNum(data?.periodo) === 6 }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default TransferenciaAlmacenDetalle;
