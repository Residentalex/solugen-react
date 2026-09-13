import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Typography, Tooltip, Descriptions, Alert, Switch, App, } from 'antd';
import { LockFilled, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard/TransaccionesAsociadasCard';
import SucursalField from '../../components/SucursalField';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
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
// Normaliza TransaccionDTO a un objeto compatible con el template existente
function normalizarTransaccion(t) {
    const monedaSimbolo = t.codigoMoneda === 'DOP' ? 'RD$' : t.codigoMoneda === 'USD' ? 'US$' : '$';
    const monedaNombre = t.codigoMoneda || '';
    return {
        ...t,
        // Alias para compatibilidad con el template
        fecha: t.fechaDocumento,
        cuentaBancaria: t.ctaBancaria || '',
        moneda: t.codigoMoneda ? { simbolo: monedaSimbolo, nombre: monedaNombre } : undefined,
        // entidad: si es objeto {codigo, nombre}, usar el nombre como string; si ya es string, dejarlo
        entidad: typeof t.entidad === 'object' && t.entidad !== null
            ? t.entidad.nombre || t.entidad.codigo || '-'
            : t.entidad || '-',
        // documento: normalizar a objeto {codigo, nombre}
        documento: typeof t.documento === 'object' && t.documento !== null
            ? t.documento
            : { codigo: t.documento || t.codigoTipo || '', nombre: '' },
        // concepto: normalizar a objeto {codigo, nombre}
        concepto: typeof t.concepto === 'object' && t.concepto !== null
            ? t.concepto
            : { codigo: '', nombre: t.concepto || '' },
    };
}
const TransaccionBancariaDetalle = () => {
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
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
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
        transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            const normalizado = normalizarTransaccion(res);
            setData(normalizado);
            setPageTitleOverride(`${strVal(normalizado.documento)}-${normalizado.noDocumento || id}`);
            // Si el documento está anulado y tiene reversoID, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionBancariaApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(normalizarTransaccion(revRes)))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar la transacción bancaria';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            const normalizado = normalizarTransaccion(res);
            setData(normalizado);
            setPageTitleOverride(`${strVal(normalizado.documento)}-${normalizado.noDocumento || id}`);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionBancariaApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(normalizarTransaccion(revRes)))
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
            const docCodigo = data.documento?.codigo || (typeof data.documento === 'string' ? data.documento : '');
            const documento = `${docCodigo}-${data.noDocumento}`;
            await transaccionBancariaApi.desaplicarDocBancario(sucursalActiva, documento, data.ctaBancaria || '');
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
    const handleAplicar = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await transaccionBancariaApi.aplicar(sucursalActiva, parseInt(id));
            message.success('Documento aplicado exitosamente');
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al aplicar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAnular = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await transaccionBancariaApi.anular(sucursalActiva, data);
            message.success('Documento anulado exitosamente');
            const res = await transaccionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id));
            const normalizado = normalizarTransaccion(res);
            setData(normalizado);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await transaccionBancariaApi.obtenerPorId(sucursalActiva, res.reversoID);
                setReversoData(normalizarTransaccion(revRes));
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
    const handlePostear = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await transaccionBancariaApi.postear(sucursalActiva, data);
            message.success('Documento posteado exitosamente');
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al postear');
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
            setPageTitleOverride(`${strVal(doc.documento)}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${strVal(doc.documento)}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    // === Early returns ===
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando transacci\u00F3n bancaria..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { rutaVolver: "/FTransBanco", onRecargar: handleRefresh });
    }
    if (!data)
        return null;
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de transacci\u00F3n bancaria", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FTransBanco", estado: documentoActivo.estado, periodo: documentoActivo.periodo, saving: saving, onVolver: () => navigate('/FTransBanco'), onEditar: () => navigate(`/FTransBanco/${id}/editar`), onAplicar: handleAplicar, onAnular: handleAnular, onPostear: handlePostear, onDesaplicar: handleDesaplicar, showImprimir: false, extraButtons: id ? (_jsx(_Fragment, { children: toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })) })) : undefined }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: strVal(documentoActivo.documento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [strVal(documentoActivo.concepto), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Cuenta Bancaria", children: _jsx(Text, { strong: true, style: { color: '#556ee6' }, children: documentoActivo.cuentaBancaria || '-' }) }), _jsx(Descriptions.Item, { label: "Fecha Doc", children: formatDate(documentoActivo.fecha) }), _jsx(Descriptions.Item, { label: "Entidad", children: strVal(documentoActivo.entidad) }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Beneficiario", children: documentoActivo?.nombreBeneficiario || '-' }), _jsx(Descriptions.Item, { label: "", children: " " }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                                    {
                                        key: 'detalles',
                                        label: `Documentos Relacionados (${data?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: false })),
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
                                }, fallbackTitulo: "Entidad" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal ?? documentoActivo.total ?? 0, descuento: documentoActivo.descuento ?? 0, impuestos: documentoActivo.impuestos ?? 0, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total ?? 0, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: strVal(documentoActivo.documento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [strVal(documentoActivo.concepto), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Cuenta Bancaria", children: _jsx(Text, { strong: true, style: { color: '#556ee6' }, children: documentoActivo.cuentaBancaria || '-' }) }), _jsx(Descriptions.Item, { label: "Fecha Doc", children: formatDate(documentoActivo.fecha) }), _jsx(Descriptions.Item, { label: "Entidad", children: strVal(documentoActivo.entidad) }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Sucursal", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "Beneficiario", children: documentoActivo?.nombreBeneficiario || '-' }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [
                            {
                                key: 'detalles',
                                label: `Documentos Relacionados (${data?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: data?.transaccionesAsociadas || [], readOnly: false })),
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
                        ] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: documentoActivo.subTotal ?? documentoActivo.total ?? 0, descuento: documentoActivo.descuento ?? 0, impuestos: documentoActivo.impuestos ?? 0, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total ?? 0, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }) })] }))] }));
};
export default TransaccionBancariaDetalle;
