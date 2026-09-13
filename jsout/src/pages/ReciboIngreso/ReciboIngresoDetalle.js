import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Tooltip, Alert, App, Typography, Dropdown } from 'antd';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, WarningFilled, PrinterOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { reciboIngresoApi } from '../../api/reciboIngresoApi';
import { transaccionApi } from '../../api/transaccionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableEditables from '../../components/AsientosContableEditables/AsientosContableEditables';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import { useQZTray } from '../../hooks/useQZTray';
import { formatTicket, escposQRCode, feed, CMD_CUT } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, CODIGO_PLANTILLA_FRI_TICKET } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
// ===== Helpers para tipo de asiento =====
function esDebito(tipo) { return tipo === 'D' || tipo === 0; }
function esCredito(tipo) { return tipo === 'C' || tipo === 1; }
const { Text } = Typography;
const ReciboIngresoDetalle = () => {
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
    const [printerModalOpen, setPrinterModalOpen] = useState(false);
    const [printerList, setPrinterList] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [detalleSearch, setDetalleSearch] = useState('');
    const [tieneScan, setTieneScan] = useState(null);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = React.useState([]);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [pagosAsociados, setPagosAsociados] = useState([]);
    const monedaDefault = getMonedaSucursalActiva();
    const screens = Grid.useBreakpoint();
    const { message } = App.useApp();
    const qz = useQZTray();
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            // Verificar si tiene factura escaneada
            reciboIngresoApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar pagos asociados
            transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
                .then((transacciones) => setPagosAsociados(transacciones || []))
                .catch(() => setPagosAsociados([]));
            // Cargar documentos relacionados desde DOCUMENTOS_RELACION
            documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    useEffect(() => {
        if (!id)
            return;
        setLoadingError(false);
        setLoading(true);
        reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
            // Verificar si tiene factura escaneada
            reciboIngresoApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar pagos asociados
            transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
                .then((transacciones) => setPagosAsociados(transacciones || []))
                .catch(() => setPagosAsociados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
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
    if (loading && !data) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FRCI", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(data.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(data.periodo) === 6;
    // ===== Documentos filtrados por búsqueda =====
    const documentosFiltrados = detalleSearch
        ? (data?.transaccionesAsociadas || []).filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.documento || '').toLowerCase().includes(q) ||
                (d.nCF || '').toLowerCase().includes(q));
        })
        : (data?.transaccionesAsociadas || []);
    // ===== Mapa de rutas para documentos relacionados =====
    const MAPA_RUTAS_DOC = {
        ND: '/FND',
        FAC: '/FFAC',
        NC: '/FNC',
        RI: '/FRI',
        NDD: '/FNDD',
        NDN: '/FNDN',
        NCN: '/FNCN',
    };
    const getRutaDocumento = (record) => {
        const tipoDoc = record?.tipoDocumento;
        if (!tipoDoc)
            return null;
        const codigo = typeof tipoDoc === 'number'
            ? (['AID', 'AIC', 'ABN', 'AJA', 'CBI', 'CDC', 'CHK', 'CHN', 'CIE', 'CIT', 'CKO', 'CPF', 'CTT', 'DBA', 'DBI', 'DCA', 'DCN', 'DEC', 'DEP', 'DEV', 'DGA', 'DPN', 'DPR', 'DVC', 'DVN', 'ED', 'EDI', 'EDN', 'EIN', 'ENP', 'EPJ', 'EPN', 'ER', 'EXP', 'FAC', 'FAN', 'LAC', 'NBN', 'NC', 'NCB', 'NCN', 'ND', 'NDB', 'NDD', 'NDN', 'NDV', 'NOM', 'ORC', 'ORT', 'PAG', 'PRES', 'PV', 'PVC', 'PVN', 'PVS', 'PVT', 'RAC', 'RBN', 'RCM', 'RDE', 'RDN', 'REA', 'REQ', 'RES', 'RETA', 'RI', 'RIN', 'RSV', 'RTB', 'RUA', 'SAP', 'SCO', 'SDD', 'SPA', 'SPJ', 'SPN', 'SPT', 'TBN', 'TID', 'TRB', 'TRP', 'TUR', 'UBD', 'VD', 'DBN', 'PVComponente', 'Existencia'][tipoDoc] || '')
            : tipoDoc;
        const rutaBase = MAPA_RUTAS_DOC[codigo];
        if (!rutaBase)
            return null;
        const docId = record.id || record.transaccionAsociadaID;
        if (!docId)
            return null;
        return `${rutaBase}/${docId}`;
    };
    const asociadasColumns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v) => v ? formatDate(v) : '-' },
        {
            title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140,
            render: (doc, record) => {
                const ruta = getRutaDocumento(record);
                if (ruta) {
                    return _jsx(Link, { to: ruta, style: { color: '#6c5ffc', fontWeight: 500 }, children: doc });
                }
                return _jsx("span", { children: doc });
            },
        },
        { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v) => v || '-' },
        { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 120, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Saldo', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right', render: (v) => _jsx("strong", { children: formatNumber(v) }) },
        { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right', render: (v) => _jsx("strong", { children: formatNumber(v) }) },
    ];
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleDesaplicarConfirm = async (_motivo) => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await reciboIngresoApi.desaplicar(sucursalActiva, documento);
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
        // Validar FechaPermitida del documento
        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
            const hoy = new Date();
            const fechaDoc = new Date(data.fechaDocumento);
            if (fechaDoc > hoy) {
                message.error('La fecha del documento no puede ser mayor a la fecha del día.');
                return;
            }
        }
        setOperacionTitulo(`Aplicando FRI-${data?.noDocumento || id}`);
        operacion.ejecutar(`/Transaccion/${sucursalActiva}/aplicar/${id}`, handleRefresh);
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
            await reciboIngresoApi.anular(sucursalActiva, dto);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
        if (data.concepto?.noAsientos) {
            message.info('El concepto no genera asientos contables.');
            return;
        }
        if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
            message.info('Debe aplicar el documento antes de postear.');
            return;
        }
        setOperacionTitulo(`Posteando RI-${data?.noDocumento || id}`);
        operacion.ejecutar(`/Transaccion/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await reciboIngresoApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await reciboIngresoApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await reciboIngresoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await reciboIngresoApi.descargarScan(sucursalActiva, parseInt(id));
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
    const printMenuItems = [
        { key: 'ticket', label: 'Ticket' },
        { key: 'carta', label: 'Factura Carta' },
    ];
    const handlePrintMenuClick = ({ key }) => {
        if (key === 'ticket') {
            handlePrintTicket();
        }
        else if (key === 'carta') {
            handlePrintCarta();
        }
    };
    const handlePrintTicket = async () => {
        if (!id || !data)
            return;
        setImprimiendo(true);
        try {
            const sucursales = useAuthStore.getState().sucursalesPermitidas;
            const sucursalNombre = sucursales.find((sp) => sp.sucursal === sucursalActiva)?.nombre || '';
            // Obtener config de plantilla (si falla o no existe, usar formato predeterminado)
            let config = null;
            try {
                config = await obtenerConfigPlantilla(CODIGO_PLANTILLA_FRI_TICKET);
            }
            catch {
                config = null;
            }
            // Generar ticket ESC/POS (texto con formato)
            let ticketText = formatTicket(data, {
                nombre: sucursalNombre,
                direccion: data.sucursal?.direccion || '',
                telefono: data.sucursal?.telefono || '',
                rnc: data.sucursal?.rnc || '',
                fax: data.sucursal?.fax || '',
                slogan: data.sucursal?.slogan || '',
            }, config || undefined, 'TICKET_RI');
            // QR se genera desde la plantilla configurable (CAMPO:CODIGO_QR)
            // const qrData = data.envioDGII?.codigoQR;
            // if (qrData) {
            //   ticketText += escposQRCode(qrData);
            // }
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
                // Mostrar selector de impresora
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
    const imprimirPDF = async () => {
        const res = await apiClient.post(`/reportes/contabilidad/reciboIngreso/ticket`, data, {
            responseType: 'blob',
        });
        const blobUrl = URL.createObjectURL(res.data);
        window.open(blobUrl, '_blank');
    };
    const handlePrintCarta = async () => {
        if (!id || !data)
            return;
        setImprimiendo(true);
        try {
            const res = await apiClient.post(`/reportes/contabilidad/reciboIngreso`, data, {
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
    };
    const tienePagos = pagosAsociados.length > 0;
    // RI8 - Verificar si los asientos están cuadrados
    const asientosNoCuadrados = (data?.asientos?.length || 0) > 0 ? (() => {
        const totalDeb = (data?.asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
        const totalCred = (data?.asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
        return Math.abs(totalDeb - totalCred) > 0.01;
    })() : false;
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
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de recibo de ingreso", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FRI", showImprimir: false, estado: data.estado, periodo: data.periodo, revisado: data.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onEditar: () => navigate(`/FRI/${id}/editar`), onAplicar: handleAplicar, onAnular: tienePagos ? undefined : async () => setModalAnularOpen(true), onPostear: data.concepto?.noAsientos ? undefined : handlePostear, onRevisado: handleRevisado, onDesaplicar: tienePagos ? undefined : async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: _jsx(_Fragment, { children: _jsxs(PermissionGate, { codigoPantalla: screenCode, accion: "IMPRIMIR", children: [_jsx(Dropdown, { menu: { items: printMenuItems, onClick: handlePrintMenuClick }, trigger: ['click'], children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), loading: imprimiendo }) }), qz.printerName && (_jsxs(Tag, { color: "success", style: { marginLeft: 2, fontSize: 11, lineHeight: '18px' }, children: ["QZ: ", qz.printerName] }))] }) }) }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 2, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Tipo", children: data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—' }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) })] }), (data.nota) && (_jsxs("div", { style: { marginTop: 12, padding: '0 16px 16px' }, children: [_jsx(Text, { strong: true, style: { fontSize: 13, color: '#595959' }, children: "Nota:" }), _jsx("div", { style: { whiteSpace: 'pre-wrap', marginTop: 4, fontSize: 13 }, children: data.nota })] }))] }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar documento...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'documentos',
                                        label: `Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`,
                                        children: (_jsx(Table, { dataSource: documentosFiltrados, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id, size: "small", pagination: false, scroll: { x: 900 } })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${data.asientos?.length || 0})`,
                                        children: (_jsxs(_Fragment, { children: [asientosNoCuadrados && (_jsx(Alert, { message: "Los asientos contables no est\u00E1n cuadrados. Los d\u00E9bitos deben ser igual a los cr\u00E9ditos.", type: "warning", showIcon: true, icon: _jsx(WarningFilled, {}), style: { marginBottom: 16 } })), _jsx(AsientosContableEditables, { asientos: data?.asientos || [], onChange: (nuevos) => setData((prev) => prev ? { ...prev, asientos: nuevos } : prev), editable: false, scroll: { x: 900 } })] })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${data.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: data.entidad, fallbackTitulo: "Entidad" }), _jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, retenciones: data.retenciones, total: data.total, alignRight: false, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsxs(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: [_jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Tipo", children: data.tipo ? `${data.tipo.codigo} - ${toTitleCase(data.tipo.nombre)}` : '—' }), _jsxs(Descriptions.Item, { label: "Concepto", children: [data.concepto?.codigo ? `${data.concepto.codigo} - ${toTitleCase(data.concepto.nombre || '')}` : (data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: data.concepto })] }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(data.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: data.codigoSucursal, sucursal: data.sucursal }) })] }), (data.nota) && (_jsxs("div", { style: { marginTop: 12, padding: '0 16px 16px' }, children: [_jsx(Text, { strong: true, style: { fontSize: 13, color: '#595959' }, children: "Nota:" }), _jsx("div", { style: { whiteSpace: 'pre-wrap', marginTop: 4, fontSize: 13 }, children: data.nota })] }))] }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar documento...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'documentos',
                                label: `Documentos (${documentosFiltrados.length}${detalleSearch ? `/${data.transaccionesAsociadas?.length || 0}` : ''})`,
                                children: (_jsx(Table, { dataSource: documentosFiltrados, columns: asociadasColumns, rowKey: (r) => r.transaccionAsociadaID || r.id, size: "small", pagination: false, scroll: { x: 900 } })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${data.asientos?.length || 0})`,
                                children: (_jsxs(_Fragment, { children: [asientosNoCuadrados && (_jsx(Alert, { message: "Los asientos contables no est\u00E1n cuadrados. Los d\u00E9bitos deben ser igual a los cr\u00E9ditos.", type: "warning", showIcon: true, icon: _jsx(WarningFilled, {}), style: { marginBottom: 16 } })), _jsx(AsientosContableEditables, { asientos: data?.asientos || [], onChange: (nuevos) => setData((prev) => prev ? { ...prev, asientos: nuevos } : prev), editable: false, scroll: { x: 900 } })] })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${data.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: data.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsx(TotalesCard, { subTotal: data.subTotal, descuento: data.descuento, impuestos: data.impuestos, retenciones: data.retenciones, total: data.total, alignRight: true, monedaSimbolo: data.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: data.moneda?.nombre || monedaDefault.nombre, tasa: data.tasa ?? 1 }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento.codigo}-${data.noDocumento}`, fechaDocumento: data.fechaDocumento, periodoCerrado: toPeriodoNum(data.periodo) === 6 }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data.documento.codigo}-${data.noDocumento}` }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() }), _jsx(ModalSeleccionarImpresoraPOS, { open: printerModalOpen, impresoras: printerList, seleccionada: selectedPrinter, onSelect: setSelectedPrinter, onConfirm: async () => {
                    if (!selectedPrinter)
                        return;
                    qz.selectPrinter(selectedPrinter);
                    setPrinterModalOpen(false);
                    // Reintentar impresión
                    handlePrintTicket();
                }, onClose: () => { setPrinterModalOpen(false); } })] }));
};
export default ReciboIngresoDetalle;
