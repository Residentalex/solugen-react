import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Tooltip, Modal, Alert, App, Switch } from 'antd';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, ReloadOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { notaDebitoApi } from '../../api/notaDebitoApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import TablaImpuestosDetalle from '../../components/TablaImpuestosDetalle';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import PermissionGate from '../../components/PermissionGate';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
const NotaDebitoDetalle = ({ tipoEntidad }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { message } = App.useApp();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [recalculando, setRecalculando] = useState(false);
    const [tieneScan, setTieneScan] = useState(null);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = useState([]);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const monedaDefault = getMonedaSucursalActiva();
    const screens = Grid.useBreakpoint();
    // ═══ Carga progresiva: banderas anti doble fetch por sección ═══
    const [relacionadosCargados, setRelacionadosCargados] = useState(false);
    const [impuestosCargados, setImpuestosCargados] = useState(false);
    const [asientosCargados, setAsientosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const relacionadosCargadosRef = useRef(false);
    const impuestosCargadosRef = useRef(false);
    const asientosCargadosRef = useRef(false);
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
    const rutaBase = tipoEntidad === 'SUP' ? 'NDSUP' : 'NDCLI';
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    useEffect(() => {
        setActiveModule(codigoPantalla);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, codigoPantalla]);
    const marcarSeccionesCompletas = useCallback(() => {
        setRelacionadosCargados(true);
        setImpuestosCargados(true);
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
            const res = await notaDebitoApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                notaDebitoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            notaDebitoApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
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
        // Guard anti doble fetch ANTES de cualquier setState: si la sección ya está
        // cargada, salir sin re-render. Esto corta los loops de "Maximum update depth".
        if ((seccion === 'relacionados' && relacionadosCargadosRef.current) ||
            (seccion === 'impuestos' && impuestosCargadosRef.current) ||
            (seccion === 'asientos' && asientosCargadosRef.current)) {
            return;
        }
        setSeccionesCargando(prev => new Set(prev).add(seccion));
        try {
            const suc = sucursalActiva;
            const numId = parseInt(id);
            switch (seccion) {
                case 'relacionados': {
                    const transaccionesAsociadas = await notaDebitoApi.obtenerRelacionados(suc, numId);
                    setData(prev => (prev ? { ...prev, transaccionesAsociadas } : prev));
                    setRelacionadosCargados(true);
                    break;
                }
                case 'impuestos': {
                    const impuestosFactura = await notaDebitoApi.obtenerImpuestos(suc, numId);
                    setData(prev => (prev ? { ...prev, impuestosFactura } : prev));
                    setImpuestosCargados(true);
                    break;
                }
                case 'asientos': {
                    const asientos = await notaDebitoApi.obtenerAsientos(suc, numId);
                    setData(prev => (prev ? { ...prev, asientos } : prev));
                    setAsientosCargados(true);
                    break;
                }
            }
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || `Error al cargar ${seccion}`;
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
    // Montaje: encabezado primero, luego las secciones críticas. Ant Design no dispara
    // onChange con defaultActiveKey, por eso la pestaña por defecto se carga aquí.
    useEffect(() => {
        const init = async () => {
            await cargarEncabezado();
            await cargarSeccion('relacionados');
        };
        init();
    }, [cargarEncabezado, cargarSeccion]);
    // Sincronizar refs de banderas para evitar stale closures en cargarSeccion
    useEffect(() => { relacionadosCargadosRef.current = relacionadosCargados; }, [relacionadosCargados]);
    useEffect(() => { impuestosCargadosRef.current = impuestosCargados; }, [impuestosCargados]);
    useEffect(() => { asientosCargadosRef.current = asientosCargados; }, [asientosCargados]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'NDN'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'ND'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
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
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                notaDebitoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            notaDebitoApi.verificarScan(sucursalActiva, parseInt(id))
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
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await notaDebitoApi.descargarScan(sucursalActiva, parseInt(id));
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
    const handleAplicar = () => {
        if (!id)
            return;
        setOperacionTitulo(`Aplicando ${rutaBase}-${data?.noDocumento || id}`);
        operacion.ejecutar(`/Transaccion/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data || !id)
            return;
        try {
            const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
            await notaDebitoApi.anular(sucursalActiva, payload);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await notaDebitoApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(revRes);
            }
            else {
                setReversoData(null);
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            message.error(msg);
            throw err;
        }
    };
    const handleDesaplicarConfirm = async (motivo) => {
        if (!id || !data)
            return;
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await notaDebitoApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            message.error(msg);
            throw err;
        }
    };
    const handlePostear = () => {
        if (!data)
            return;
        setOperacionTitulo(`Posteando ${rutaBase}-${data?.noDocumento || id}`);
        operacion.ejecutar(`/Transaccion/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await notaDebitoApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
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
            await notaDebitoApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await notaDebitoApi.obtenerPorId(sucursalActiva, res.reversoID);
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
    const handleRecalcular = async () => {
        if (!id)
            return;
        setRecalculando(true);
        try {
            await notaDebitoApi.recalcular(sucursalActiva, parseInt(id));
            const res = await notaDebitoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            message.success('Documento recalculado correctamente');
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al recalcular');
            message.error(msg);
        }
        finally {
            setRecalculando(false);
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
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FNDB", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    // asientoColumns reemplazado por AsientosContableTable compartido
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de nota de d\u00E9bito", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: codigoPantalla, estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        const res = await apiClient.post('/reportes/contabilidad/nota-debito', data, {
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
                }, onEditar: () => navigate(`/${codigoPantalla}/${id}/editar`), confirmActions: false, onAplicar: handleAplicar, onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), _jsx(PermissionGate, { permisoEspecial: "pe_recalcular", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRecalcular, loading: recalculando, children: "Recalcular" }) })] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", onChange: (key) => {
                                    // Secciones perezosas bajo demanda con guards anti doble fetch
                                    if (key === 'impuestos')
                                        cargarSeccion('impuestos');
                                    if (key === 'asientos')
                                        cargarSeccion('asientos');
                                    if (key === 'documentos')
                                        cargarSeccion('relacionados');
                                }, items: [
                                    {
                                        key: 'documentos',
                                        label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('relacionados'), tip: "Cargando documentos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(TransaccionesAsociadasCard, { documentos: (documentoActivo?.transaccionesAsociadas || []).map((d) => ({
                                                        ...d,
                                                        esDocumentoInventario: d.esDocumentoInventario ?? false,
                                                    })), readOnly: true }) }) })),
                                    },
                                    {
                                        key: 'impuestos',
                                        label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('impuestos'), tip: "Cargando impuestos...", children: _jsx("div", { style: { minHeight: 120 }, children: _jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] }) }) })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID }) }) })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.entidad, fallbackTitulo: tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente' }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", onChange: (key) => {
                            // Secciones perezosas bajo demanda con guards anti doble fetch
                            if (key === 'impuestos')
                                cargarSeccion('impuestos');
                            if (key === 'asientos')
                                cargarSeccion('asientos');
                            if (key === 'documentos')
                                cargarSeccion('relacionados');
                        }, items: [
                            {
                                key: 'documentos',
                                label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('relacionados'), tip: "Cargando documentos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(TransaccionesAsociadasCard, { documentos: (documentoActivo?.transaccionesAsociadas || []).map((d) => ({
                                                ...d,
                                                esDocumentoInventario: d.esDocumentoInventario ?? false,
                                            })), readOnly: true }) }) })),
                            },
                            {
                                key: 'impuestos',
                                label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('impuestos'), tip: "Cargando impuestos...", children: _jsx("div", { style: { minHeight: 120 }, children: _jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] }) }) })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('asientos'), tip: "Cargando asientos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID }) }) })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data?.documento?.codigo || rutaBase}-${data?.noDocumento || id}` }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data?.documento?.codigo || rutaBase}-${data?.noDocumento || ''}`, fechaDocumento: data?.fechaDocumento || '', periodoCerrado: toPeriodoNum(data?.periodo) === 6 })] }));
};
export default NotaDebitoDetalle;
