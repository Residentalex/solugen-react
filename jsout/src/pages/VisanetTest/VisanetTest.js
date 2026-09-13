import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, InputNumber, Select, Modal, Tag, Typography, Space, Row, Col, Alert, Table, Drawer, message } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, PrinterOutlined, CreditCardOutlined, StopOutlined, FolderOpenOutlined, FileExcelOutlined, ReloadOutlined, CodeOutlined, HeartOutlined, IdcardOutlined, ReadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { getCompanyName, exportToExcel } from '../../utils/exportToExcel';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { useCompanyStore } from '../../stores/companyStore';
import { visanetApi } from '../../api/visanetApi';
import VisanetVoucher from '../../components/VisanetVoucher';
import { useQZTray } from '../../hooks/useQZTray';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { formatTicket } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, CODIGO_PLANTILLA_VSNT_VOUCHER } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
const { Title, Text } = Typography;
const SUBSIDIO_OPCIONES = [
    { label: 'COMER ES PRIMERO', value: ' ' },
    { label: 'ENVEJECIENTES', value: 'E' },
    { label: 'BONO ESCOLAR', value: 'F' },
    { label: 'ILAE', value: 'G' },
    { label: 'ESTUDIANTES', value: 'B' },
    { label: 'PIPP', value: 'D' },
    { label: 'BONOGAS HOGAR', value: 'C' },
    { label: 'BONOGAS CHOFER', value: 'H' },
    { label: 'MEDICINA', value: 'A' },
    { label: 'BONO LUZ', value: 'I' },
    { label: 'OPORTUNIDAD 14/24', value: 'O' },
    { label: 'TRANSFORMANDO MI PAIS', value: 'T' },
    { label: 'MOTOBEN', value: 'M' },
];
const SUBSIDIO_MONTOS = {
    ' ': 1650, // COMER ES PRIMERO
    'E': 400, // ENVEJECIENTES
    'F': 300, // BONO ESCOLAR
};
const SUBSIDIO_NOMBRES = {
    ' ': 'COMER ES PRIMERO',
    'G': 'ILAE',
    'B': 'ESTUDIANTES',
    'E': 'ENVEJECIENTES',
    'D': 'PIPP',
    'C': 'BONOGAS HOGAR',
    'H': 'BONOGAS CHOFER',
    'A': 'MEDICINA',
    'I': 'BONO LUZ',
    'F': 'BONO ESCOLAR',
    'O': 'OPORTUNIDAD 14/24',
    'T': 'TRANSFORMANDO MI PAIS',
    'M': 'MOTOBEN',
};
const VisanetTest = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const qz = useQZTray();
    // Estado de carga y resultado
    const [loading, setLoading] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [error, setError] = useState(null);
    // Última venta ejecutada (se conserva para imprimir el voucher)
    const [montoPesos, setMontoPesos] = useState(null);
    const [tokenECR, setTokenECR] = useState('');
    // Campos Subsidio
    const [subsidioMontoPesos, setSubsidioMontoPesos] = useState(null);
    const [subsidyId, setSubsidyId] = useState('');
    // Subsidio seleccionado en el listado (pendiente de confirmación)
    const [subsidioConfirmacion, setSubsidioConfirmacion] = useState(null);
    // Modales de operación
    const [venderModalOpen, setVenderModalOpen] = useState(false);
    const [venderMonto, setVenderMonto] = useState(null);
    const [venderTokenECR, setVenderTokenECR] = useState('');
    const [anularModalOpen, setAnularModalOpen] = useState(false);
    const [anularTokenId, setAnularTokenId] = useState('');
    const [cerrarLoteModalOpen, setCerrarLoteModalOpen] = useState(false);
    // Drawer de JSON de respuesta (soporte)
    const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);
    // Registros del día (vouchers)
    const [vouchers, setVouchers] = useState([]);
    const [vouchersLoading, setVouchersLoading] = useState(false);
    // Estado del modal voucher
    const [voucherVisible, setVoucherVisible] = useState(false);
    // Datos de empresa
    const companyStore = useCompanyStore();
    const [companyName, setCompanyName] = useState('');
    const [sucursalName, setSucursalName] = useState('');
    const [simMoneda, setSimMoneda] = useState('RD$');
    const [tipoOperacion, setTipoOperacion] = useState('venta');
    // Obtener datos de empresa al iniciar
    useEffect(() => {
        getCompanyName(sucursalActiva).then(setCompanyName);
        setSimMoneda(getMonedaSucursalActiva().simbolo);
        const suc = companyStore.data.sucursales.find((s) => s.sucursal === sucursalActiva);
        setSucursalName(suc?.nombre || '');
    }, [sucursalActiva]);
    // Estado del selector de impresora QZ Tray
    const [printerModalOpen, setPrinterModalOpen] = useState(false);
    const [printerList, setPrinterList] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    // Carga los vouchers del día (GET /visanet/{sucursal}/vouchers-dia)
    const cargarVouchersDelDia = useCallback(async () => {
        setVouchersLoading(true);
        try {
            const data = await visanetApi.obtenerVouchersDelDia(sucursalActiva);
            setVouchers(data || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar los vouchers del día');
        }
        finally {
            setVouchersLoading(false);
        }
    }, [sucursalActiva]);
    // Cargar registros del día al montar
    useEffect(() => {
        cargarVouchersDelDia();
    }, [cargarVouchersDelDia]);
    // Handlers
    const ejecutarVenta = async (montoPesosParam, tokenECRParam) => {
        setLoading('vender');
        setError(null);
        setResultado(null);
        try {
            if (!montoPesosParam || montoPesosParam <= 0) {
                setError('Ingresa un monto válido mayor a 0');
                return;
            }
            const res = await visanetApi.vender(sucursalActiva, 0, montoPesosParam, tokenECRParam || undefined);
            setResultado(res);
            setTipoOperacion('venta');
            setMontoPesos(montoPesosParam);
            setTokenECR(tokenECRParam || '');
            await cargarVouchersDelDia();
            if (res?.exitoso) {
                imprimirVoucherConDatos(res, 'venta', montoPesosParam);
            }
        }
        catch (err) {
            setError(err?.response?.data?.errorMessage || err.message || 'Error al vender');
        }
        finally {
            setLoading(null);
        }
    };
    const confirmarVentaModal = async () => {
        if (!venderMonto || venderMonto <= 0) {
            message.warning('Ingresa un monto válido mayor a 0');
            return;
        }
        setVenderModalOpen(false);
        await ejecutarVenta(venderMonto, venderTokenECR || undefined);
    };
    const ejecutarVentaSubsidio = async (subsidyIdParam, montoPesosParam) => {
        setLoading('subsidio');
        setError(null);
        setResultado(null);
        try {
            if (!montoPesosParam || montoPesosParam <= 0) {
                setError('Ingresa un monto válido mayor a 0');
                return;
            }
            const res = await visanetApi.venderSubsidio(sucursalActiva, 0, montoPesosParam, subsidyIdParam);
            setResultado(res);
            setTipoOperacion('subsidio');
            await cargarVouchersDelDia();
            if (res?.exitoso) {
                imprimirVoucherConDatos(res, 'subsidio', montoPesosParam, subsidyIdParam);
            }
        }
        catch (err) {
            setError(err?.response?.data?.errorMessage || err.message || 'Error al vender con subsidio');
        }
        finally {
            setLoading(null);
        }
    };
    const handleVenderSubsidio = async () => {
        await ejecutarVentaSubsidio(subsidyId, subsidioMontoPesos ?? 0);
    };
    const ejecutarAnulacion = async (tokenIdParam) => {
        setLoading('anular');
        setError(null);
        setResultado(null);
        try {
            const res = await visanetApi.anular(sucursalActiva, tokenIdParam);
            setResultado(res);
            await cargarVouchersDelDia();
        }
        catch (err) {
            setError(err?.response?.data?.errorMessage || err.message || 'Error al anular');
        }
        finally {
            setLoading(null);
        }
    };
    const confirmarAnularModal = async () => {
        const token = anularTokenId.trim();
        if (!token) {
            message.warning('Ingresa el TokenId a anular');
            return;
        }
        setAnularModalOpen(false);
        await ejecutarAnulacion(token);
    };
    const confirmarCerrarLoteModal = async () => {
        setCerrarLoteModalOpen(false);
        setLoading('cerrar');
        setError(null);
        setResultado(null);
        try {
            const res = await visanetApi.cerrarLote(sucursalActiva);
            setResultado(res);
            await cargarVouchersDelDia();
        }
        catch (err) {
            setError(err?.response?.data?.errorMessage || err.message || 'Error al cerrar lote');
        }
        finally {
            setLoading(null);
        }
    };
    // Fallback de impresión: abre una ventana emergente con SOLO el ticket y llama print() al cargar
    const imprimirTicketEnVentana = (ticketText, logo) => {
        const ventana = window.open('', '_blank', 'width=380,height=600');
        if (!ventana) {
            message.error('El navegador bloqueó la ventana de impresión. Habilita los popups para este sitio o usa QZ Tray.');
            return;
        }
        const ticketHtml = ticketText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // Logo configurable: insertar <img> centrado antes del <pre> si esta activo y hay fuente.
        let logoHtml = '';
        if (logo?.mostrar) {
            const logoSrc = logo.base64
                ? (logo.base64.startsWith('data:') ? logo.base64 : `data:image/png;base64,${logo.base64}`)
                : logo.url;
            if (logoSrc) {
                const ancho = logo.anchoPx ?? 384;
                logoHtml = `<div style="text-align:center;margin-bottom:8px"><img src="${logoSrc}" style="max-width:${ancho}px;max-height:120px;object-fit:contain" /></div>`;
            }
        }
        ventana.document.write('<!DOCTYPE html><html><head><title>Voucher</title>' +
            '<style>' +
            'html, body { margin: 0; padding: 0; }' +
            'body { padding: 16px; }' +
            'pre { font-family: "Courier New", Courier, monospace; font-size: 12px; ' +
            'width: 300px; max-width: 100%; white-space: pre-wrap; word-wrap: break-word; margin: 0; }' +
            '</style></head><body>' +
            logoHtml +
            '<pre>' + ticketHtml + '</pre>' +
            '<script>window.addEventListener("load", function () { window.focus(); window.print(); });</script>' +
            '</body></html>');
        ventana.document.close();
    };
    // Imprime el voucher con los datos de la venta recibidos como argumentos
    // (sin depender del estado del closure, para evitar imprimir datos obsoletos).
    const imprimirVoucherConDatos = async (resultadoVenta, tipoOp, monto, subsidyId) => {
        const suc = companyStore.data.sucursales.find((s) => s.sucursal === sucursalActiva);
        const company = {
            nombre: suc?.nombre || '',
            direccion: suc?.direccion || '',
            telefono: suc?.telefono || '',
            rnc: suc?.rnc || '',
            fax: suc?.fax || '',
            slogan: suc?.slogan || '',
        };
        const configPlantilla = await obtenerConfigPlantilla(CODIGO_PLANTILLA_VSNT_VOUCHER);
        const subsidioLabel = tipoOp === 'venta' ? 'VENTA' : (SUBSIDIO_NOMBRES[subsidyId ?? ''] || 'SUBSIDIO');
        const dataVoucher = {
            ...resultadoVenta,
            montoPesos: monto,
            simMoneda,
            sucursalName,
            subsidioLabel,
        };
        const ticketText = formatTicket(dataVoucher, company, configPlantilla ?? undefined, 'TICKET_VSNT');
        // Logo configurable: generar comando GS v 0 (base64) si la plantilla lo activa.
        let logoBase64 = '';
        if (configPlantilla?.logo?.mostrar) {
            logoBase64 = await obtenerLogoEscPosBase64(configPlantilla.logo);
        }
        try {
            await qz.print(ticketText, logoBase64 || undefined);
            message.success('Imprimiendo voucher...');
        }
        catch (err) {
            if (err.code === 'NO_PRINTER_SELECTED') {
                try {
                    const list = await qz.fetchPrinters();
                    if (list.length > 0) {
                        setPrinterList(list);
                        setSelectedPrinter(list[0] || '');
                        setPrinterModalOpen(true);
                    }
                    else {
                        message.warning('No se encontraron impresoras. Imprimiendo en pantalla...');
                        imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
                    }
                }
                catch {
                    message.warning('QZ Tray no disponible. Imprimiendo en pantalla...');
                    imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
                }
            }
            else {
                message.error('QZ Tray: ' + (err.message || 'Error'));
                imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
            }
        }
    };
    // Botón manual "Imprimir": wrapper que usa el estado actual (comportamiento idéntico al original).
    const handlePrintQZ = async () => {
        if (!resultado || typeof resultado === 'string')
            return;
        // El monto del ticket depende de la operación: venta normal o subsidio
        const monto = tipoOperacion === 'venta' ? (montoPesos || 0) : (subsidioMontoPesos || 0);
        await imprimirVoucherConDatos(resultado, tipoOperacion, monto, subsidyId);
    };
    const handleCopiarJson = () => {
        const texto = JSON.stringify(resultado, null, 2);
        navigator.clipboard.writeText(texto);
        message.success('JSON copiado al portapapeles');
    };
    const subsidioLabel = tipoOperacion === 'venta' ? 'VENTA' : (SUBSIDIO_NOMBRES[subsidyId] || 'SUBSIDIO');
    // Columnas de la tabla de registros del día
    const columnasVouchers = [
        {
            title: 'NOSEC',
            dataIndex: 'noSec',
            key: 'noSec',
            width: 80,
            render: (noSec, record) => (_jsx("span", { style: record.anulado === 'S' ? { textDecoration: 'line-through' } : undefined, children: noSec })),
        },
        { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId', width: 150 },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            width: 130,
            align: 'right',
            render: (monto) => (monto != null ? `${simMoneda} ${monto.toFixed(2)}` : '-'),
        },
        { title: 'Tarjeta', dataIndex: 'notarjeta', key: 'notarjeta', width: 140 },
        { title: 'Autorización', dataIndex: 'noAprob', key: 'noAprob', width: 120 },
        { title: 'RRN', dataIndex: 'rrn', key: 'rrn', width: 130 },
        { title: 'Lote', dataIndex: 'noLote', key: 'noLote', width: 90 },
        {
            title: 'Estado',
            key: 'estado',
            width: 120,
            render: (_, record) => (record.anulado === 'S' ? _jsx(Tag, { color: "red", children: "ANULADO" }) : _jsx(Tag, { color: "green", children: "APROBADO" })),
        },
        { title: 'Origen', dataIndex: 'origen', key: 'origen', width: 110 },
        { title: 'Respuesta', dataIndex: 'respuestaMsg', key: 'respuestaMsg', width: 220, ellipsis: true },
    ];
    const handleExportarExcelVouchers = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columnasVouchers.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `VisanetVouchers_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'VisanetVouchers',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: vouchers.map((item) => cols.map((col) => {
                if (col.key === 'estado') {
                    return item.anulado === 'S' ? 'ANULADO' : 'APROBADO';
                }
                if (col.key === 'monto') {
                    return item.monto != null ? item.monto.toFixed(2) : '';
                }
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/CCENTRALSUPERVISION'), children: "Volver" }), _jsx(Title, { level: 4, style: { margin: 0 }, children: "Cobro con Tarjeta (Visanet)" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { type: "primary", icon: _jsx(CreditCardOutlined, {}), style: { height: 40 }, loading: loading === 'vender', onClick: () => {
                            setVenderMonto(null);
                            setVenderTokenECR('');
                            setVenderModalOpen(true);
                        }, children: "Vender" }), _jsx(Button, { danger: true, icon: _jsx(StopOutlined, {}), style: { height: 40 }, loading: loading === 'anular', onClick: () => {
                            setAnularTokenId('');
                            setAnularModalOpen(true);
                        }, children: "Anular" }), _jsx(Button, { icon: _jsx(FolderOpenOutlined, {}), style: { height: 40 }, loading: loading === 'cerrar', onClick: () => setCerrarLoteModalOpen(true), children: "Cerrar Lote" })] }), _jsxs(Row, { gutter: [16, 16], style: { marginBottom: 16 }, children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Card, { title: "Subsidios prioritarios", size: "small", className: "paces-card", children: _jsx(Row, { gutter: [12, 12], children: Object.entries(SUBSIDIO_MONTOS).map(([id, monto]) => {
                                    const KPI_CONFIG = {
                                        ' ': { color: '#34c38f', bg: 'rgba(52,195,143,0.1)', icon: _jsx(HeartOutlined, {}) },
                                        'E': { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: _jsx(IdcardOutlined, {}) },
                                        'F': { color: '#f0b345', bg: 'rgba(240,179,69,0.1)', icon: _jsx(ReadOutlined, {}) },
                                    };
                                    const kpi = KPI_CONFIG[id] || { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: _jsx(CreditCardOutlined, {}) };
                                    return (_jsx(Col, { xs: 24, sm: 8, children: _jsxs("div", { className: "dashboard-kpi-card", style: { cursor: 'pointer', '--kpi-accent': kpi.color }, onClick: () => setSubsidioConfirmacion({ subsidyId: id, montoPesos: monto }), children: [_jsxs("div", { className: "dashboard-kpi-top", children: [_jsx("div", { className: "dashboard-kpi-icon", style: { background: kpi.bg, color: kpi.color }, children: kpi.icon }), _jsx("span", { className: "dashboard-kpi-chip", children: "Monto" })] }), _jsxs("div", { className: "dashboard-kpi-value", children: [simMoneda, ' ', monto.toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })] }), _jsx("p", { className: "dashboard-kpi-label", children: SUBSIDIO_NOMBRES[id] || 'SUBSIDIO' })] }) }, id));
                                }) }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Card, { title: "\uD83C\uDFAB Subsidio", size: "small", className: "paces-card", children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, children: [_jsx(InputNumber, { placeholder: "Monto en pesos (ej: 500.00)", style: { width: '100%' }, precision: 2, min: 0, value: subsidioMontoPesos, onChange: (v) => setSubsidioMontoPesos(v ?? null), onPressEnter: handleVenderSubsidio }), _jsx(Select, { placeholder: "Seleccionar subsidio", style: { width: '100%' }, allowClear: true, options: SUBSIDIO_OPCIONES, value: subsidyId || undefined, onChange: (val) => {
                                            const value = val ?? '';
                                            setSubsidyId(value);
                                            const montoDefinido = SUBSIDIO_MONTOS[value];
                                            if (montoDefinido != null) {
                                                setSubsidioMontoPesos(montoDefinido);
                                            }
                                        } }), _jsx(Button, { type: "primary", block: true, loading: loading === 'subsidio', onClick: handleVenderSubsidio, children: "Vender" })] }) }) })] }), error && (_jsx(Alert, { type: "error", message: "Error", description: error, showIcon: true, style: { marginTop: 16 } })), resultado && !error && typeof resultado === 'object' && 'exitoso' in resultado && (_jsxs(Space, { style: { marginTop: 16 }, children: [_jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: () => setVoucherVisible(true), children: "Ver Voucher" }), _jsx(Button, { icon: _jsx(CodeOutlined, {}), onClick: () => setJsonDrawerOpen(true), children: "Ver JSON (soporte)" })] })), _jsx(VisanetVoucher, { visible: voucherVisible, onClose: () => setVoucherVisible(false), respuesta: resultado && typeof resultado === 'object' && 'exitoso' in resultado
                    ? resultado
                    : {}, montoPesos: tipoOperacion === 'venta' ? (montoPesos || 0) : (subsidioMontoPesos || 0), transacId: 0, onPrintQZ: handlePrintQZ, companyName: companyName, sucursalName: sucursalName, simMoneda: simMoneda, subsidioLabel: subsidioLabel }), _jsxs(Card, { className: "paces-card-erp", title: "Registros del d\u00EDa", style: { borderRadius: 8, overflow: 'hidden', marginTop: 16 }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcelVouchers }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarVouchersDelDia })] }) }), _jsx(Table, { rowKey: "noSec", className: "paces-border-top paces-list-table", size: "middle", columns: columnasVouchers, dataSource: vouchers, loading: vouchersLoading, scroll: { x: 1300 }, pagination: { showTotal: (t) => `${t} registros` }, rowClassName: (record) => (record.anulado === 'S' ? 'paces-text-secondary' : '') })] }), _jsx(Modal, { title: "Confirmar venta de subsidio", open: subsidioConfirmacion !== null, onCancel: () => setSubsidioConfirmacion(null), onOk: () => {
                    const confirmacion = subsidioConfirmacion;
                    if (!confirmacion)
                        return;
                    const { subsidyId: subsId, montoPesos: monto } = confirmacion;
                    setSubsidyId(subsId);
                    setSubsidioMontoPesos(monto);
                    setSubsidioConfirmacion(null);
                    ejecutarVentaSubsidio(subsId, monto);
                }, okText: "Vender", cancelText: "Cancelar", okButtonProps: { loading: loading === 'subsidio' }, children: subsidioConfirmacion && (_jsxs("p", { style: { margin: 0 }, children: ["\u00BFDeseas vender el subsidio", ' ', _jsx("strong", { children: SUBSIDIO_NOMBRES[subsidioConfirmacion.subsidyId] || 'SUBSIDIO' }), " por un monto de", ' ', _jsxs("strong", { children: [simMoneda, ' ', subsidioConfirmacion.montoPesos.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })] }), "?"] })) }), _jsx(Modal, { title: "Vender (PAX)", open: venderModalOpen, onCancel: () => setVenderModalOpen(false), onOk: confirmarVentaModal, okText: "Vender", cancelText: "Cancelar", okButtonProps: { loading: loading === 'vender' }, children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: "small", children: [_jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "Monto en pesos" }), _jsx(InputNumber, { style: { width: '100%' }, precision: 2, min: 0, value: venderMonto, onChange: (v) => setVenderMonto(v ?? null), onPressEnter: confirmarVentaModal, placeholder: "Ej: 1500.00", autoFocus: true })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "TokenECR (opcional)" }), _jsx(Input, { placeholder: "TokenECR", value: venderTokenECR, onChange: (e) => setVenderTokenECR(e.target.value) })] })] }) }), _jsx(Modal, { title: "Anular (PAX)", open: anularModalOpen, onCancel: () => setAnularModalOpen(false), onOk: confirmarAnularModal, okText: "Anular", cancelText: "Cancelar", okButtonProps: { loading: loading === 'anular', danger: true }, children: _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "TokenId a anular" }), _jsx(Input, { placeholder: "TokenId", value: anularTokenId, onChange: (e) => setAnularTokenId(e.target.value), autoFocus: true })] }) }), _jsx(Modal, { title: "Cerrar Lote (PAX)", open: cerrarLoteModalOpen, onCancel: () => setCerrarLoteModalOpen(false), onOk: confirmarCerrarLoteModal, okText: "Cerrar Lote", cancelText: "Cancelar", okButtonProps: { loading: loading === 'cerrar' }, children: _jsx("p", { style: { margin: 0 }, children: "\u00BFDeseas cerrar el lote de transacciones del PAX? Esta acci\u00F3n no se puede deshacer." }) }), _jsx(ModalSeleccionarImpresoraPOS, { open: printerModalOpen, impresoras: printerList, seleccionada: selectedPrinter, onSelect: setSelectedPrinter, onConfirm: async () => {
                    if (selectedPrinter) {
                        qz.selectPrinter(selectedPrinter);
                        setPrinterModalOpen(false);
                        setTimeout(() => handlePrintQZ(), 200);
                    }
                }, onClose: () => setPrinterModalOpen(false), titulo: "Seleccionar impresora", okText: "Seleccionar", deshabilitarOkSinSeleccion: false, usarSelect: true }), _jsxs(Drawer, { title: "JSON de respuesta", open: jsonDrawerOpen, onClose: () => setJsonDrawerOpen(false), width: 560, children: [_jsx("p", { style: { marginTop: 0 }, children: "Si necesitas soporte t\u00E9cnico, copia este JSON y env\u00EDalo al equipo de desarrollo." }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }, children: _jsx(Button, { size: "small", icon: _jsx(CopyOutlined, {}), onClick: handleCopiarJson, children: "Copiar JSON" }) }), _jsx("pre", { style: {
                            maxHeight: 'calc(100vh - 260px)',
                            overflow: 'auto',
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 4,
                            fontSize: 12,
                            margin: 0,
                        }, children: JSON.stringify(resultado, null, 2) })] })] }));
};
export default VisanetTest;
