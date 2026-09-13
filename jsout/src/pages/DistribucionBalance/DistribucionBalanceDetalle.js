import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Input, Tooltip, Typography, Empty, Alert, Switch } from 'antd';
import { ArrowLeftOutlined, LockFilled, ReloadOutlined } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import PermissionGate from '../../components/PermissionGate';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import DocumentosBalanceCard from '../../components/DocumentosBalanceCard';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
const DistribucionBalanceDetalle = ({ tipoEntidad }) => {
    const { Text } = Typography;
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [data, setData] = useState(null);
    const [asociadas, setAsociadas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [recalculando, setRecalculando] = useState(false);
    const [debitosSearch, setDebitosSearch] = useState('');
    const [creditosSearch, setCreditosSearch] = useState('');
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const monedaDefault = getMonedaSucursalActiva();
    const screens = Grid.useBreakpoint();
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
    useEffect(() => {
        setActiveModule(codigoPantalla);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride, codigoPantalla]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        setError(null);
        distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                const msg = 'Documento no encontrado en la sucursal seleccionada.';
                setError(msg);
                message.error(msg);
                return;
            }
            setData(res);
            const data = res;
            setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                distribucionBalanceApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Cargar transacciones asociadas desde el DTO principal
            setAsociadas(res.transaccionesAsociadas || []);
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
            setError(msg);
            message.error(msg);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'DBA'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'DBA'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    const debitos = (asociadas || []).filter((t) => t.origenCuenta?.toLowerCase() === 'debito' || t.origenCuenta === 'D' || t.origenCuenta === '0');
    const creditos = (asociadas || []).filter((t) => t.origenCuenta?.toLowerCase() === 'credito' || t.origenCuenta === 'C' || t.origenCuenta === '1');
    const debitosFiltrados = useMemo(() => {
        if (!debitosSearch)
            return debitos;
        const q = debitosSearch.toLowerCase();
        return debitos.filter((d) => (d.documento || '').toLowerCase().includes(q) ||
            (d.nCF || '').toLowerCase().includes(q));
    }, [debitos, debitosSearch]);
    const creditosFiltrados = useMemo(() => {
        if (!creditosSearch)
            return creditos;
        const q = creditosSearch.toLowerCase();
        return creditos.filter((d) => (d.documento || '').toLowerCase().includes(q) ||
            (d.nCF || '').toLowerCase().includes(q));
    }, [creditos, creditosSearch]);
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    if (error) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx("div", { style: { fontSize: 18, color: '#ff4d4f', marginBottom: 16 }, children: "Error" }), _jsx("div", { style: { marginBottom: 24 }, className: "paces-text-secondary", children: error }), _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(`/${codigoPantalla}`), children: "Volver" })] }));
    }
    if (!data) {
        return null;
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = ESTADO_DOCUMENTO_MAP[toEstadoNum(documentoActivo.estado)] || { label: 'Desconocido', color: 'default' };
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    // ===== Columnas para Débitos y Créditos =====
    const asociadasColumnsDebito = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, render: (v) => formatDate(v) },
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
        { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v) => v || '—' },
        { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 110, align: 'right', render: (v) => formatNumber(v) },
        { title: 'Saldo Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right', render: (v) => _jsx(Text, { strong: true, style: { color: v > 0 ? '#faad14' : undefined }, children: formatNumber(v) }) },
        { title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 110, align: 'right', responsive: ['md'], render: (v) => formatNumber(v || 0) },
        { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right', render: (v) => _jsx(Text, { strong: true, style: { color: '#556ee6' }, children: formatNumber(v) }) },
    ];
    const asociadasColumnsCredito = asociadasColumnsDebito.map(col => col.key === 'monto'
        ? { ...col, render: (v) => _jsx(Text, { strong: true, style: { color: '#34c38f' }, children: formatNumber(v) }) }
        : col);
    // asientoColumns reemplazado por AsientosContableTable compartido
    // ===== Handlers de acciones de estado =====
    const handleAplicar = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await distribucionBalanceApi.aplicar(sucursalActiva, parseInt(id));
            message.success('Documento aplicado exitosamente');
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al aplicar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAnularConfirm = async (dataAnular) => {
        if (!data || !id)
            return;
        try {
            const payload = { ...data, motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
            await distribucionBalanceApi.anular(sucursalActiva, payload);
            message.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await distribucionBalanceApi.obtenerPorId(sucursalActiva, res.reversoID);
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
            const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await distribucionBalanceApi.desaplicar(sucursalActiva, documento, sucursalActiva);
            message.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            message.error(msg);
            throw err;
        }
    };
    const handlePostear = async () => {
        if (!data)
            return;
        setSaving(true);
        try {
            await distribucionBalanceApi.postear(sucursalActiva, data);
            message.success('Documento posteado exitosamente');
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al postear');
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
            await distribucionBalanceApi.recalcular(sucursalActiva, parseInt(id));
            message.success('Documento recalculado correctamente');
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al recalcular');
            message.error(msg);
        }
        finally {
            setRecalculando(false);
        }
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await distribucionBalanceApi.revisado(sucursalActiva, parseInt(id));
            message.success('Documento marcado como revisado');
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
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
            await distribucionBalanceApi.reversar(sucursalActiva, parseInt(id));
            message.success('Documento reversado exitosamente');
            const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
            setData(res);
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                const revRes = await distribucionBalanceApi.obtenerPorId(sucursalActiva, res.reversoID);
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
    return (_jsxs("div", { children: [_jsx(DetalleToolbar, { modulo: codigoPantalla, estado: documentoActivo.estado, periodo: documentoActivo.periodo, saving: saving, imprimiendo: imprimiendo, onVolver: () => navigate(`/${codigoPantalla}`), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        const res = await apiClient.get(`/reportes/contabilidad/distribucionBalance/${sucursalActiva}/${id}`, {
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
                }, onEditar: () => navigate(`/${codigoPantalla}/${id}/editar`), onAplicar: handleAplicar, onDesaplicar: async () => setModalDesaplicarOpen(true), onAnular: async () => setModalAnularOpen(true), onPostear: handlePostear, onRevisado: handleRevisado, onReversar: handleReversar, confirmActions: false, extraButtons: _jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), _jsx(PermissionGate, { permisoEspecial: "pe_recalcular", children: _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRecalcular, loading: recalculando, children: "Recalcular" }) })] }) }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: documentoActivo.noDocumento || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Tasa", children: documentoActivo.tasa ? formatNumber(documentoActivo.tasa) : '-' })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", items: [
                                    {
                                        key: 'documentos',
                                        label: `Documentos (${debitos.length + creditos.length})`,
                                        children: (_jsx(DocumentosBalanceCard, { debitos: debitos, creditos: creditos })),
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
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.entidad, titulo: tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente' }), documentoActivo.beneficiario && (_jsx(EntidadCard, { entidad: documentoActivo.beneficiario, titulo: "Beneficiario" })), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, retenciones: documentoActivo.retenciones, total: documentoActivo.total, alignRight: false, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Documento", children: documentoActivo.noDocumento || '-' }), _jsx(Descriptions.Item, { label: "Fecha", children: formatDate(documentoActivo.fechaDocumento) }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Tasa", children: documentoActivo.tasa ? formatNumber(documentoActivo.tasa) : '-' })] }) }), _jsx(Tabs, { defaultActiveKey: "documentos", type: "card", items: [
                            {
                                key: 'documentos',
                                label: `Documentos (${debitos.length + creditos.length})`,
                                children: (_jsx(DocumentosBalanceCard, { debitos: debitos, creditos: creditos })),
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
                        ] }), _jsx("div", { style: { marginTop: 16 }, children: _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, retenciones: documentoActivo.retenciones, total: documentoActivo.total, alignRight: true, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1 }) })] })), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || id}` }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || ''}`, fechaDocumento: data?.fechaDocumento || '', periodoCerrado: toPeriodoNum(data?.periodo) === 6 }), _jsx(ModalProgreso, { open: saving, titulo: `${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || id}`, eventos: [], completado: saving ? null : { exito: true }, onClose: () => { } })] }));
};
export default DistribucionBalanceDetalle;
