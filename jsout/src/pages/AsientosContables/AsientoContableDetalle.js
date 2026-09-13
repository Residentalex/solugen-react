import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Tooltip, Descriptions, Alert, Switch } from 'antd';
import { LockFilled, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { transaccionApi } from '../../api/transaccionApi';
import DetalleToolbar from '../../components/DetalleToolbar';
import { ErrorDetalle } from '../../components';
import AsientosContableTable from '../../components/AsientosContableTable';
import DetalleMovimientoTable from '../../components/DetalleMovimientoTable';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import LogTable from '../../components/LogTable';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { obtenerNombreSucursal } from '../../utils/sucursalEnumMapper';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import SucursalField from '../../components/SucursalField';
import { documentoRelacionApi } from '../../api/documentoRelacionApi';
import CobrosCard from '../../components/CobrosCard';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
function toTitleCase(str) {
    if (!str)
        return '';
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatDate(val) {
    if (!val)
        return '-';
    const d = new Date(val);
    if (isNaN(d.getTime()))
        return val;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const AsientoContableDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig();
    const screens = Grid.useBreakpoint();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = React.useState([]);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
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
        const idNum = parseInt(id, 10);
        if (isNaN(idNum)) {
            message.error('ID de transacción inválido');
            setLoading(false);
            return;
        }
        transaccionApi.obtenerPorId(sucursalActiva, idNum)
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento?.codigo || ''}-${res.noDocumento || `Transacción #${res.id}`}`);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el detalle del asiento contable';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    React.useEffect(() => {
        if (!data?.id)
            return;
        documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
            .then(rel => setDocumentosRelacionados(rel || []))
            .catch(() => {
            setDocumentosRelacionados([]);
        });
    }, [data?.id, sucursalActiva]);
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const asientosMapeados = React.useMemo(() => (documentoActivo?.asientos || []).map(a => ({
        ...a,
        cuentaContable: {
            noCuenta: a.cuentaContable?.noCuenta || a.noCuenta || '',
            nombre: a.cuentaContable?.nombre || '',
        },
    })), [documentoActivo?.asientos]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        setData(null);
        setLoading(true);
        const idNum = parseInt(id, 10);
        if (isNaN(idNum)) {
            message.error('ID de transacción inválido');
            setLoading(false);
            return;
        }
        transaccionApi.obtenerPorId(sucursalActiva, idNum)
            .then((res) => {
            if (!res) {
                message.error('Documento no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(`${res.documento?.codigo || ''}-${res.noDocumento || `Transacción #${res.id}`}`);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                transaccionApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el detalle del asiento contable';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    const recargar = useCallback(async () => {
        if (!data?.id)
            return;
        const res = await transaccionApi.obtenerPorId(sucursalActiva, data.id);
        if (res)
            setData(res);
    }, [data?.id, sucursalActiva]);
    // Actualizar el título al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            setPageTitleOverride(`${reversoData.documento?.codigo || ''}-${reversoData.noDocumento || `Reverso #${reversoData.id}`}`);
        }
        else if (data) {
            setPageTitleOverride(`${data.documento?.codigo || ''}-${data.noDocumento || `Transacción #${data.id}`}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    if (loading || (!data && !loadingError)) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando asiento contable..." })] }));
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { mensaje: "Error al cargar el documento", rutaVolver: "/FAsientoContable", onRecargar: handleRefresh });
    }
    if (!data)
        return null;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    const permisoModificarAdmin = usuario?.permisosEspeciales?.some((p) => p.codigo === 'pe_modificar_admin' && p.valor === true) ?? false;
    const esReverso = data.reversoID != null && data.reversoID > 0;
    const handlePostear = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await transaccionApi.postear(sucursalActiva, data);
            message.success('Documento posteado correctamente');
            await recargar();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al postear';
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAplicar = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await transaccionApi.aplicar(sucursalActiva, data.id);
            message.success('Documento aplicado correctamente');
            await recargar();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al aplicar';
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleDesaplicarConfirm = async (motivo) => {
        if (!data)
            return;
        setSaving(true);
        const documento = `${data.documento?.codigo || ''}-${data.noDocumento || ''}`;
        try {
            await transaccionApi.desaplicar(sucursalActiva, documento);
            message.success('Documento desaplicado correctamente');
            setModalDesaplicarOpen(false);
            await recargar();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al desaplicar';
            message.error(msg);
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
            await transaccionApi.anular(sucursalActiva, dto);
            message.success('Documento anulado correctamente');
            setModalAnularOpen(false);
            await recargar();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al anular';
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle del asiento contable", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: screenCode, estado: data.estado, periodo: data.periodo, saving: saving, imprimiendo: imprimiendo, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        message.info('Funcionalidad de impresión en desarrollo');
                    }
                    catch {
                        message.error('Error al generar el PDF');
                    }
                    finally {
                        setImprimiendo(false);
                    }
                }, onEditar: () => navigate(`/FAsientoContable/${data.id}/editar`), edicionSinRestricciones: permisoModificarAdmin, onAplicar: handleAplicar, onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onDesaplicar: async () => setModalDesaplicarOpen(true), extraButtons: id ? (_jsx(_Fragment, { children: toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })) })) : undefined }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { lg: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Concepto:", children: documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : toTitleCase(documentoActivo.concepto?.nombre || documentoActivo.codigoConcepto || '-') }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia:", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "asientos", type: "card", items: [
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: asientosMapeados, scroll: { x: 600 }, rowKey: (r) => `${r.id || ''}` })),
                                    },
                                    {
                                        key: 'detalles',
                                        label: `Detalles (${documentoActivo.detalles?.length || 0})`,
                                        children: (_jsx(DetalleMovimientoTable, { detalles: documentoActivo.detalles || [], scroll: { x: 1000 } })),
                                    },
                                    {
                                        key: 'documentos',
                                        label: `Documentos Asociados (${documentoActivo.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: documentoActivo.transaccionesAsociadas || [], readOnly: true })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 800 } })),
                                    },
                                    {
                                        key: 'cobros',
                                        label: `Cobros (${documentoActivo.cobros?.length || 0})`,
                                        children: (_jsx(CobrosCard, { cobros: documentoActivo.cobros || [] })),
                                    },
                                ] })] }), _jsxs(Col, { lg: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.entidad, fallbackTitulo: "Entidad" }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, monedaSimbolo: documentoActivo.codigoMoneda || getMonedaSucursalActiva().codigo, tasa: documentoActivo.tasa ?? 1 })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Fecha:", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "Concepto:", children: documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : toTitleCase(documentoActivo.concepto?.nombre || documentoActivo.codigoConcepto || '-') }), _jsx(Descriptions.Item, { label: "NCF:", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia:", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Sucursal:", children: _jsx(SucursalField, { codigoSucursal: documentoActivo.codigoSucursal, sucursal: documentoActivo.sucursal }) }), _jsx(Descriptions.Item, { label: "NCF Modificado:", children: documentoActivo.ncfModificado || '-' }), _jsx(Descriptions.Item, { label: "Nota:", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, total: documentoActivo.total, monedaSimbolo: documentoActivo.codigoMoneda || getMonedaSucursalActiva().codigo, tasa: documentoActivo.tasa ?? 1, alignRight: true }) }), _jsx(Tabs, { defaultActiveKey: "asientos", type: "card", items: [
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(AsientosContableTable, { asientos: asientosMapeados, scroll: { x: 600 }, rowKey: (r) => `${r.id || ''}` })),
                            },
                            {
                                key: 'detalles',
                                label: `Detalles (${documentoActivo.detalles?.length || 0})`,
                                children: (_jsx(DetalleMovimientoTable, { detalles: documentoActivo.detalles || [], scroll: { x: 1000 } })),
                            },
                            {
                                key: 'documentos',
                                label: `Documentos Asociados (${documentoActivo.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: documentoActivo.transaccionesAsociadas || [], readOnly: true })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 800 } })),
                            },
                            {
                                key: 'cobros',
                                label: `Cobros (${documentoActivo.cobros?.length || 0})`,
                                children: (_jsx(CobrosCard, { cobros: documentoActivo.cobros || [] })),
                            },
                        ] })] })), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento?.codigo || ''}-${data.noDocumento || ''}`, fechaDocumento: data.fechaDocumento, periodoCerrado: esCerrado })] }));
};
export default AsientoContableDetalle;
