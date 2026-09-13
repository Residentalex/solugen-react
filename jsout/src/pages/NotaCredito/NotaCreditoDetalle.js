import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Tooltip, Modal, Alert, App, QRCode, Input, Typography, Switch, Dropdown } from 'antd';
import { ExclamationCircleOutlined, LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, ReloadOutlined, SendOutlined, CheckCircleOutlined, PrinterOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { dgiiApi } from '../../api/dgiiApi';
import { notaCreditoApi } from '../../api/notaCreditoApi';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
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
import { useQZTray } from '../../hooks/useQZTray';
import { formatTicket, feed, CMD_CUT } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, obtenerConfigPorId, CODIGO_PLANTILLA_NC_TICKET } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import { companiaApi } from '../../api/companiaApi';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import ErrorDetalle from '../../components/ErrorDetalle';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import TablaImpuestosDetalle from '../../components/TablaImpuestosDetalle';
import { useScreenConfig } from '../../hooks/useScreenConfig';
const NotaCreditoDetalle = ({ tipoEntidad }) => {
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
    const [estadoDGII, setEstadoDGII] = useState(null);
    const [enviandoDGII, setEnviandoDGII] = useState(false);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const screens = Grid.useBreakpoint();
    const qz = useQZTray();
    const [detalleSearch, setDetalleSearch] = useState('');
    const [printerModalOpen, setPrinterModalOpen] = useState(false);
    const [printerList, setPrinterList] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [plantillaEntdoc, setPlantillaEntdoc] = useState(null);
    const monedaDefault = getMonedaSucursalActiva();
    // ═══ Carga progresiva: banderas anti doble fetch por sección ═══
    const [relacionadosCargados, setRelacionadosCargados] = useState(false);
    const [detallesCargados, setDetallesCargados] = useState(false);
    const [impuestosCargados, setImpuestosCargados] = useState(false);
    const [asientosCargados, setAsientosCargados] = useState(false);
    const [seccionesCargando, setSeccionesCargando] = useState(new Set());
    const relacionadosCargadosRef = useRef(false);
    const detallesCargadosRef = useRef(false);
    const impuestosCargadosRef = useRef(false);
    const asientosCargadosRef = useRef(false);
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FNCSUP' : 'FNCCLI';
    const { screenCode, documentCode } = useScreenConfig(codigoPantalla);
    const rutaBase = tipoEntidad === 'SUP' ? 'NCSUP' : 'NCCLI';
    const rutasDocumentos = {
        NC: tipoEntidad === 'CLI' ? '/FNCCLI' : '/FNCSUP',
        ND: tipoEntidad === 'CLI' ? '/FNDCLI' : '/FNDSUP',
        FAC: '/FFAC',
        TRN: '/FTRN',
        RDE: '/FRDE',
        ENP: '/FENP',
        DVC: '/FDVC',
        SAP: '/FSAP',
        DEV: '/FDEV',
        PV: '/FPV',
    };
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    useEffect(() => {
        setActiveModule(codigoPantalla);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, codigoPantalla]);
    // Plantilla de ticket asignada via ENTDOC 'NC' (fallback al codigo fijo NC_TICKET)
    useEffect(() => {
        let activo = true;
        reportesConfigApi.obtenerPorEntdoc('NC')
            .then((p) => { if (activo && p?.plantillaId)
            setPlantillaEntdoc({ plantillaId: p.plantillaId, tipo: p.tipo }); })
            .catch(() => { });
        return () => { activo = false; };
    }, []);
    const marcarSeccionesCompletas = useCallback(() => {
        setRelacionadosCargados(true);
        setDetallesCargados(true);
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
            const res = await notaCreditoApi.obtenerEncabezado(sucursalActiva, parseInt(id));
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                notaCreditoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            const promises = [
                notaCreditoApi.verificarScan(sucursalActiva, parseInt(id))
                    .then((scanRes) => setTieneScan(scanRes.existe))
                    .catch(() => setTieneScan(false)),
            ];
            if (res.ncf) {
                promises.push(apiClient.get(`/DGII/${sucursalActiva}/${res.id}`)
                    .then(({ data: resp }) => { setEstadoDGII(resp?.data || null); })
                    .catch(() => { setEstadoDGII(null); }));
            }
            Promise.all(promises).catch((err) => console.warn('Error en cargas secundarias del detalle', err));
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
            (seccion === 'detalles' && detallesCargadosRef.current) ||
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
                    const transaccionesAsociadas = await notaCreditoApi.obtenerRelacionados(suc, numId);
                    setData(prev => (prev ? { ...prev, transaccionesAsociadas } : prev));
                    setRelacionadosCargados(true);
                    break;
                }
                case 'detalles': {
                    const detalles = await notaCreditoApi.obtenerDetalles(suc, numId);
                    setData(prev => (prev ? { ...prev, detalles } : prev));
                    setDetallesCargados(true);
                    break;
                }
                case 'impuestos': {
                    const impuestosFactura = await notaCreditoApi.obtenerImpuestos(suc, numId);
                    setData(prev => (prev ? { ...prev, impuestosFactura } : prev));
                    setImpuestosCargados(true);
                    break;
                }
                case 'asientos': {
                    const asientos = await notaCreditoApi.obtenerAsientos(suc, numId);
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
    useEffect(() => { detallesCargadosRef.current = detallesCargados; }, [detallesCargados]);
    useEffect(() => { impuestosCargadosRef.current = impuestosCargados; }, [impuestosCargados]);
    useEffect(() => { asientosCargadosRef.current = asientosCargados; }, [asientosCargados]);
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
        notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id))
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
                notaCreditoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            const promises = [
                notaCreditoApi.verificarScan(sucursalActiva, parseInt(id))
                    .then((scanRes) => setTieneScan(scanRes.existe))
                    .catch(() => setTieneScan(false)),
                // Cargar documentos relacionados desde DOCUMENTOS_RELACION
                documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
                    .then(rel => setDocumentosRelacionados(rel || []))
                    .catch(() => setDocumentosRelacionados([])),
            ];
            if (res.ncf) {
                promises.push(apiClient.get(`/DGII/${sucursalActiva}/${res.id}`)
                    .then(({ data: resp }) => { setEstadoDGII(resp?.data || null); })
                    .catch(() => { setEstadoDGII(null); }));
            }
            Promise.all(promises).catch((err) => console.warn('Error en cargas secundarias al recargar', err));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'NC'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'NC'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await notaCreditoApi.descargarScan(sucursalActiva, parseInt(id));
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
        // Validar DGII si el tipo lo requiere
        if (data?.tipo?.envioDGII && !estadoDGII?.codigoQR) {
            message.error('Debe enviar el documento a la DGII antes de aplicar.');
            return;
        }
        // Validar FechaPermitida (si aplica)
        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
            const hoy = new Date();
            const fechaDoc = new Date(data.fechaDocumento);
            if (fechaDoc > hoy) {
                message.error('La fecha del documento no puede ser mayor a la fecha del día.');
                return;
            }
        }
        setOperacionTitulo(`Aplicando ${rutaBase}-${data?.noDocumento || id}`);
        operacion.ejecutar(`/Transaccion/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data || !id)
            return;
        try {
            const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
            await notaCreditoApi.anular(sucursalActiva, payload);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await notaCreditoApi.obtenerPorId(sucursalActiva, res.reversoID);
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
            await notaCreditoApi.desaplicar(sucursalActiva, documento);
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
            await notaCreditoApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await notaCreditoApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            // Recarga completa: todas las secciones quedan cargadas
            marcarSeccionesCompletas();
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await notaCreditoApi.obtenerPorId(sucursalActiva, res.reversoID);
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
            await notaCreditoApi.recalcular(sucursalActiva, parseInt(id));
            const res = await notaCreditoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
    const handleEnviarDGII = async () => {
        if (!id || !data)
            return;
        setEnviandoDGII(true);
        try {
            const respuesta = await dgiiApi.cargarYEnviarFactura(sucursalActiva, parseInt(id), 'NC');
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
            content: '¿Desea reasignar un nuevo NCF a esta nota de crédito?',
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
    const printMenuItems = [
        { key: 'ticket', label: 'Ticket' },
        { key: 'nota-credito', label: 'Nota Crédito' },
    ];
    const handlePrintMenuClick = ({ key }) => {
        if (key === 'ticket') {
            handleImprimirTicket();
        }
        else if (key === 'nota-credito') {
            imprimirPDF();
        }
    };
    const imprimirPDF = async () => {
        setImprimiendo(true);
        try {
            const res = await apiClient.post('/reportes/contabilidad/nota-credito', data, {
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
    const handleImprimirTicket = async () => {
        if (!id || !data)
            return;
        setImprimiendo(true);
        try {
            // Asegurar detalles (carga perezosa por pestañas)
            let datosTicket = data;
            if (!(data.detalles || data.detallesMovimiento)?.length) {
                const detalles = await notaCreditoApi.obtenerDetalles(sucursalActiva, parseInt(id));
                datosTicket = { ...data, detalles };
            }
            // Datos de la compañía desde la sucursal activa
            let companyInfo = { nombre: '', direccion: '', telefono: '', rnc: '', fax: '', slogan: '' };
            try {
                const lista = await companiaApi.obtenerTodas(sucursalActiva);
                if (lista.length > 0) {
                    companyInfo = {
                        nombre: lista[0].nombre ?? '',
                        direccion: lista[0].direccion ?? '',
                        telefono: lista[0].telefono ?? '',
                        rnc: lista[0].rnc ?? '',
                        fax: lista[0].fax ?? '',
                        slogan: lista[0].slogan ?? '',
                    };
                }
            }
            catch {
                const sucursales = useAuthStore.getState().sucursalesPermitidas;
                companyInfo.nombre = sucursales.find((sp) => sp.sucursal === sucursalActiva)?.nombre || '';
            }
            // Config de plantilla: por ENTDOC 'NC', fallback al codigo fijo NC_TICKET
            let config = null;
            let tipoDoc = 'TICKET_NC';
            if (plantillaEntdoc) {
                try {
                    config = await obtenerConfigPorId(plantillaEntdoc.plantillaId);
                    tipoDoc = plantillaEntdoc.tipo;
                }
                catch {
                    config = null;
                }
            }
            else {
                try {
                    config = await obtenerConfigPlantilla(CODIGO_PLANTILLA_NC_TICKET);
                }
                catch {
                    config = null;
                }
            }
            // Generar ticket ESC/POS (texto con formato)
            let ticketText = formatTicket(datosTicket, companyInfo, config || undefined, tipoDoc);
            // Avance y corte DESPUÉS del QR
            ticketText += feed(config?.opciones?.feedCorte ?? 4);
            ticketText += CMD_CUT;
            // Logo configurable: generar comando GS v 0 (base64) si la plantilla lo activa.
            let logoBase64 = '';
            if (config?.logo?.mostrar) {
                logoBase64 = await obtenerLogoEscPosBase64(config.logo);
            }
            // Enviar a QZ Tray como texto raw ESC/POS
            await qz.print(ticketText, logoBase64 || undefined);
            message.success(`Imprimiendo en: ${qz.printerName || 'Impresora POS'}`);
        }
        catch (err) {
            if (err.code === 'NO_PRINTER_SELECTED') {
                try {
                    const list = await qz.fetchPrinters();
                    if (list.length === 0) {
                        await imprimirPDF();
                    }
                    else {
                        setPrinterList(list);
                        setSelectedPrinter(list[0] || '');
                        setPrinterModalOpen(true);
                    }
                }
                catch {
                    await imprimirPDF();
                }
            }
            else {
                message.error('QZ Tray: ' + (err.message || 'Error'));
                await imprimirPDF();
            }
        }
        finally {
            setImprimiendo(false);
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
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
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
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: record.codigo || '-' }), record.referencia && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5 }, children: record.referencia }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx("div", { children: toTitleCase(record.articulo || '') }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }, children: record.familia?.nombre ? _jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) }) : null })] })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsx("div", { children: _jsx("div", { children: formatNumber(record.cantidad || 0) }) })),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (_, record) => _jsx("div", { children: formatNumber(record.precio || 0) }),
        },
        {
            title: 'SubTotal',
            dataIndex: 'subTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => _jsx("div", { children: formatNumber(record.subTotal || 0) }),
        },
        {
            title: 'Impuestos',
            dataIndex: 'impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => _jsx("div", { children: formatNumber(record.impuestos || 0) }),
        },
        {
            title: 'Descuento',
            dataIndex: 'descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => _jsx("div", { children: formatNumber(record.descuento || 0) }),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => _jsx(Typography.Text, { strong: true, children: formatNumber(record.total || 0) }),
        },
    ];
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FNDC", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    // asientoColumns reemplazado por AsientosContableTable compartido
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de nota de cr\u00E9dito", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: codigoPantalla, estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(`/${codigoPantalla}`), showImprimir: false, onEditar: () => navigate(`/${codigoPantalla}/${id}/editar`), confirmActions: true, onAplicar: handleAplicar, onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: id ? (_jsxs(_Fragment, { children: [_jsxs(PermissionGate, { codigoPantalla: codigoPantalla, accion: "IMPRIMIR", children: [_jsx(Dropdown, { menu: { items: printMenuItems, onClick: handlePrintMenuClick }, trigger: ['click'], children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo }) }), qz.printerName && (_jsxs(Tag, { color: "success", style: { marginLeft: 2, fontSize: 11, lineHeight: '18px' }, children: ["QZ: ", qz.printerName] }))] }), toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), !data?.ncf ? (_jsx(PermissionGate, { codigoPantalla: codigoPantalla, permisoEspecial: "pe_preasignar_ncf", children: _jsx(Button, { icon: _jsx(FileTextOutlined, {}), size: "small", onClick: handleReasignarNCF, disabled: toEstadoNum(data?.estado) !== 1, children: "Reasignar NCF" }) })) : !estadoDGII?.codigoQR ? (_jsxs(_Fragment, { children: [_jsx(PermissionGate, { codigoPantalla: codigoPantalla, permisoEspecial: "pe_marcar_enviado", children: _jsx(Button, { icon: _jsx(SendOutlined, {}), size: "small", onClick: handleEnviarDGII, loading: enviandoDGII, disabled: toEstadoNum(data?.estado) !== 1, children: "Enviar DGII" }) }), _jsx(PermissionGate, { codigoPantalla: codigoPantalla, permisoEspecial: "pe_preasignar_ncf", children: _jsx(Button, { icon: _jsx(FileTextOutlined, {}), size: "small", onClick: handleReasignarNCF, disabled: toEstadoNum(data?.estado) !== 1, children: "Reasignar NCF" }) })] })) : (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "DGII OK" })), _jsx(Divider, { type: "vertical" }), _jsx(PermissionGate, { permisoEspecial: "pe_recalcular", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRecalcular, loading: recalculando, children: "Recalcular" }) })] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: toTitleCase(documentoActivo.nota || '') || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", onChange: (key) => {
                                    // Secciones perezosas bajo demanda con guards anti doble fetch
                                    if (key === 'impuestos')
                                        cargarSeccion('impuestos');
                                    if (key === 'detalles')
                                        cargarSeccion('detalles');
                                    if (key === 'asientos')
                                        cargarSeccion('asientos');
                                    if (key === 'documentos')
                                        cargarSeccion('relacionados');
                                }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'documentos',
                                        label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('relacionados'), tip: "Cargando documentos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(TransaccionesAsociadasCard, { documentos: documentoActivo?.transaccionesAsociadas || [], readOnly: true, rutas: rutasDocumentos }) }) })),
                                    },
                                    {
                                        key: 'impuestos',
                                        label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('impuestos'), tip: "Cargando impuestos...", children: _jsx("div", { style: { minHeight: 120 }, children: _jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] }) }) })),
                                    },
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo?.detalles?.length || 0}` : ''})`,
                                        children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
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
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.entidad, fallbackTitulo: tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente' }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), estadoDGII?.codigoQR && (_jsx("div", { style: { textAlign: 'center', marginBottom: 16 }, children: _jsx(QRCode, { value: estadoDGII.codigoQR, size: 140 }) })), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto:", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Tipo:", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: toTitleCase(documentoActivo.nota || '') || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", onChange: (key) => {
                            // Secciones perezosas bajo demanda con guards anti doble fetch
                            if (key === 'impuestos')
                                cargarSeccion('impuestos');
                            if (key === 'detalles')
                                cargarSeccion('detalles');
                            if (key === 'asientos')
                                cargarSeccion('asientos');
                            if (key === 'documentos')
                                cargarSeccion('relacionados');
                        }, tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar detalle...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'documentos',
                                label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('relacionados'), tip: "Cargando documentos...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(TransaccionesAsociadasCard, { documentos: documentoActivo?.transaccionesAsociadas || [], readOnly: true, rutas: rutasDocumentos }) }) })),
                            },
                            {
                                key: 'impuestos',
                                label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('impuestos'), tip: "Cargando impuestos...", children: _jsx("div", { style: { minHeight: 120 }, children: _jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] }) }) })),
                            },
                            {
                                key: 'detalles',
                                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${documentoActivo?.detalles?.length || 0}` : ''})`,
                                children: (_jsx(Spin, { spinning: seccionesCargando.has('detalles'), tip: "Cargando detalles...", children: _jsx("div", { style: { minHeight: 220 }, children: _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: (r, i) => r.id || i, size: "small", pagination: false, scroll: { x: 1100 } }) }) })),
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
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }), estadoDGII?.codigoQR && (_jsx("div", { style: { textAlign: 'center' }, children: _jsx(QRCode, { value: estadoDGII.codigoQR, size: 140 }) })), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data?.documento?.codigo || rutaBase}-${data?.noDocumento || id}` }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data?.documento?.codigo || rutaBase}-${data?.noDocumento || ''}`, fechaDocumento: data?.fechaDocumento || '', periodoCerrado: toPeriodoNum(data?.periodo) === 6 }), _jsx(ModalSeleccionarImpresoraPOS, { open: printerModalOpen, impresoras: printerList, seleccionada: selectedPrinter, onSelect: setSelectedPrinter, onConfirm: async () => {
                    if (!selectedPrinter)
                        return;
                    qz.selectPrinter(selectedPrinter);
                    setPrinterModalOpen(false);
                    handleImprimirTicket();
                }, onClose: () => { setPrinterModalOpen(false); } })] }));
};
export default NotaCreditoDetalle;
