import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Tooltip, Descriptions, Alert, Modal, App, Switch, } from 'antd';
import { LockFilled, BankOutlined, PrinterOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import { apiClient } from '../../api/client';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard/TransaccionesAsociadasCard';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
const { Text } = Typography;
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
// Helper para obtener string de fields que pueden ser string u objeto
function strVal(val, fallback = '-') {
    if (!val)
        return fallback;
    if (typeof val === 'string')
        return val;
    if (typeof val === 'object')
        return val.nombre || val.codigo || fallback;
    return String(val);
}
const SolicitudPagoDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig();
    const { message } = App.useApp();
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const monedaDefault = getMonedaSucursalActiva();
    const operacion = useAplicar();
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const [imprimiendo, setImprimiendo] = useState(false);
    // Módulo activo
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    // Carga inicial
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`SPA-${res.noDocumento || id}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                solicitudPagoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar la solicitud de pago';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
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
            setPageTitleOverride(`SPA-${res.noDocumento || id}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                solicitudPagoApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride]);
    // === Handlers de estado ===
    const handleDesaplicar = async () => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `${data.documento?.codigo || data.documento || ''}-${data.noDocumento}`;
            await solicitudPagoApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado exitosamente');
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
        setOperacionTitulo(`Aplicando SPA-${data?.noDocumento || id}`);
        operacion.ejecutar(`/SPA/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await solicitudPagoApi.anular(sucursalActiva, data);
            message.success('Documento anulado exitosamente');
            const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await solicitudPagoApi.obtenerPorId(sucursalActiva, res.reversoID);
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
        setOperacionTitulo(`Posteando SPA-${data?.noDocumento || id}`);
        operacion.ejecutar(`/SPA/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await solicitudPagoApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await solicitudPagoApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await solicitudPagoApi.obtenerPorId(sucursalActiva, res.reversoID);
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
    const handleGenerarPago = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            const idDocBancario = await solicitudPagoApi.generarPago(sucursalActiva, parseInt(id));
            message.success('Pago generado exitosamente');
            navigate(`/FTransBanco/${idDocBancario}`);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al generar pago');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`SPA-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`SPA-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    // === Early returns ===
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando solicitud de pago..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FSOLP", onRecargar: handleRefresh });
    }
    if (!data)
        return null;
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    // asientoColumns reemplazado por AsientosContableTable compartido
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de solicitud de pago", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FSPA", estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onEditar: () => navigate(`/FSPA/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, onRevisado: handleRevisado, onDesaplicar: handleDesaplicar, onReversar: handleReversar, showImprimir: true, imprimiendo: imprimiendo, onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        const res = await apiClient.get(`/reportes/banco/solicitud-pago/${sucursalActiva}/${id}`, {
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
                }, extraButtons: id ? (_jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), toEstadoNum(data?.estado) === 2 && data?.tipoPagoCodigo && (_jsxs(_Fragment, { children: [_jsx(Divider, { type: "vertical" }), _jsx(Tooltip, { title: data.pagoGenerado ? 'Ya existe un pago generado' : 'Generar documento de pago', children: _jsx(Button, { type: "primary", icon: _jsx(BankOutlined, {}), onClick: handleGenerarPago, loading: saving, disabled: !!data.pagoGenerado, children: data.pagoGenerado ? 'Pago generado' : `Generar ${data?.tipoPagoCodigo}` }) })] }))] })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [toTitleCase(strVal(documentoActivo.concepto)), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Cta. Bancaria", children: toTitleCase(documentoActivo.cuentaBancaria || '') || '-' }), _jsx(Descriptions.Item, { label: "Doc. a Generar", children: toTitleCase(data?.tipoPagoCodigo || '') || '-' }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: toTitleCase(documentoActivo.nota || '') || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                                    {
                                        key: 'detalles',
                                        label: `Documentos Asociados (${data?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: false, ocultarPerdida: true })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 900 } })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: {
                                    nombre: typeof documentoActivo.entidad === 'string' ? documentoActivo.entidad : documentoActivo.entidad?.nombre || '',
                                    identificacion: documentoActivo.entidad?.identificacion || '',
                                    telefono: documentoActivo.entidad?.telefono || '',
                                    direccion: documentoActivo.entidad?.direccion || '',
                                    beneficiario: data?.nombreBeneficiario || '',
                                }, fallbackTitulo: "Entidad" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal ?? documentoActivo.total ?? 0, descuento: documentoActivo.descuento ?? 0, impuestos: documentoActivo.impuestos ?? 0, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total ?? 0, nota: documentoActivo.nota || '', alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [toTitleCase(strVal(documentoActivo.concepto)), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Cta. Bancaria", children: toTitleCase(documentoActivo.cuentaBancaria || '') || '-' }), _jsx(Descriptions.Item, { label: "Doc. a Generar", children: toTitleCase(data?.tipoPagoCodigo || '') || '-' }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: toTitleCase(documentoActivo.nota || '') || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                            {
                                key: 'detalles',
                                label: `Documentos Asociados (${data?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: false, ocultarPerdida: true })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 900 } })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: documentoActivo.subTotal ?? documentoActivo.total ?? 0, descuento: documentoActivo.descuento ?? 0, impuestos: documentoActivo.impuestos ?? 0, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total ?? 0, nota: documentoActivo.nota || '', alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }) })] })), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default SolicitudPagoDetalle;
