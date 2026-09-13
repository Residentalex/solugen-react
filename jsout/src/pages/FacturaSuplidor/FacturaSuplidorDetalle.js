import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, message, Tooltip, Modal, Alert, App, Switch, Typography } from 'antd';
import { LockFilled, IdcardOutlined, PhoneOutlined, EnvironmentOutlined, FileTextOutlined, FileSearchOutlined, ExclamationCircleOutlined, RedoOutlined, } from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import PermissionGate from '../../components/PermissionGate';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalVisorScanner from '../../components/ModalVisorScanner/ModalVisorScanner';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { apiClient } from '../../api/client';
import { documentoImpresionApi } from '../../api/documentoImpresionApi';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { transaccionApi } from '../../api/transaccionApi';
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
import { ESTADO_DOCUMENTO_MAP, resolveEstado, toEstadoNum, toPeriodoNum } from '../../utils/estadoDocumento';
import ErrorDetalle from '../../components/ErrorDetalle';
import TransaccionesAsociadasCard from '../../components/TransaccionesAsociadasCard';
import TablaImpuestosDetalle from '../../components/TablaImpuestosDetalle';
const FacturaSuplidorDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode, documentCode } = useScreenConfig('FRDE');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [tieneScan, setTieneScan] = useState(null);
    const [scannerModalOpen, setScannerModalOpen] = useState(false);
    const [scannerUrl, setScannerUrl] = useState(null);
    const [scannerLoading, setScannerLoading] = useState(false);
    const [documentosRelacionados, setDocumentosRelacionados] = useState([]);
    const [modalAnularOpen, setModalAnularOpen] = useState(false);
    const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
    const [pagosAsociados, setPagosAsociados] = useState([]);
    const [operacionTitulo, setOperacionTitulo] = useState('');
    const [recalculando, setRecalculando] = useState(false);
    const monedaDefault = getMonedaSucursalActiva();
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [mostrandoReverso, setMostrandoReverso] = useState(false);
    const [reversoData, setReversoData] = useState(null);
    const [detalleSearch, setDetalleSearch] = useState('');
    const { message: messageApi } = App.useApp();
    const operacion = useAplicar();
    const screens = Grid.useBreakpoint();
    useEffect(() => {
        setActiveModule(screenCode);
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    const handleRefresh = useCallback(() => {
        if (!id)
            return;
        setLoadingError(false);
        facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                const msg = 'Documento no encontrado en la sucursal seleccionada.';
                messageApi.error(msg);
                setLoadingError(true);
                return;
            }
            setData(res);
            // Calcular balance de asientos contables
            const totalDeb = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 0 || r.tipoAsiento === 'D') ? (r.monto || 0) : 0), 0);
            const totalCred = (res?.asientos || []).reduce((s, r) => s + ((r.tipoAsiento === 1 || r.tipoAsiento === 'C') ? (r.monto || 0) : 0), 0);
            operacion.setBalanceInfo({ debitos: totalDeb, creditos: totalCred });
            const data = res;
            setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                facturaSuplidorApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Verificar scan
            facturaSuplidorApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar documentos relacionados
            documentoRelacionApi.obtenerPorTransaccion(data.id)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
            // Cargar pagos asociados
            transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
                .then((transacciones) => setPagosAsociados(transacciones || []))
                .catch(() => setPagosAsociados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
            messageApi.error(msg);
            setLoadingError(true);
        });
    }, [id, sucursalActiva, setPageTitleOverride, messageApi]);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        facturaSuplidorApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((res) => {
            if (!res) {
                const msg = 'Documento no encontrado en la sucursal seleccionada.';
                messageApi.error(msg);
                setLoadingError(true);
                return;
            }
            setData(res);
            const data = res;
            setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);
            // Si el documento está anulado y tiene reversoId, cargar el reverso
            if (toEstadoNum(res.estado) === 3 && res.reversoID) {
                facturaSuplidorApi.obtenerPorId(sucursalActiva, res.reversoID)
                    .then((revRes) => setReversoData(revRes))
                    .catch(() => setReversoData(null));
            }
            else {
                setReversoData(null);
                setMostrandoReverso(false);
            }
            // Verificar scan
            facturaSuplidorApi.verificarScan(sucursalActiva, parseInt(id))
                .then((scanRes) => setTieneScan(scanRes.existe))
                .catch(() => setTieneScan(false));
            // Cargar documentos relacionados
            documentoRelacionApi.obtenerPorTransaccion(data.id)
                .then(rel => setDocumentosRelacionados(rel || []))
                .catch(() => setDocumentosRelacionados([]));
            // Cargar pagos asociados
            transaccionApi.obtenerAsociadasInventario(sucursalActiva, data.id)
                .then((transacciones) => setPagosAsociados(transacciones || []))
                .catch(() => setPagosAsociados([]));
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
            messageApi.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, setPageTitleOverride, messageApi]);
    // Actualizar el título del header al alternar entre Original/Reverso
    useEffect(() => {
        if (mostrandoReverso && reversoData) {
            const doc = reversoData;
            setPageTitleOverride(`${doc.documento?.codigo || 'RDE'}-${doc.noDocumento || ''}`);
        }
        else if (data) {
            const doc = data;
            setPageTitleOverride(`${doc.documento?.codigo || 'RDE'}-${doc.noDocumento || ''}`);
        }
    }, [mostrandoReverso, reversoData, data, setPageTitleOverride]);
    const handleVerScanner = async () => {
        if (!id)
            return;
        setScannerLoading(true);
        try {
            const blob = await facturaSuplidorApi.descargarScan(sucursalActiva, parseInt(id));
            const url = URL.createObjectURL(blob);
            setScannerUrl(url);
            setScannerModalOpen(true);
        }
        catch (err) {
            messageApi.error('Error al cargar el archivo escaneado');
        }
        finally {
            setScannerLoading(false);
        }
    };
    const handleAplicar = async () => {
        if (!id)
            return;
        // Validar FechaPermitida del documento
        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
            const hoy = new Date();
            const fechaDoc = new Date(data.fechaDocumento);
            if (fechaDoc > hoy) {
                messageApi.error('La fecha del documento no puede ser mayor a la fecha del día.');
                return;
            }
            if (data.fechaEntrega) {
                const fechaEntrega = new Date(data.fechaEntrega);
                if (fechaEntrega > hoy) {
                    messageApi.error('La fecha de entrega no puede ser mayor a la fecha del día.');
                    return;
                }
            }
        }
        // Validar NCF duplicado antes de aplicar
        if (data?.ncf && data?.suplidor?.codigo) {
            try {
                const ncfExiste = await facturaSuplidorApi.verificarNCF(sucursalActiva, data.ncf, data.suplidor.codigo);
                if (ncfExiste) {
                    messageApi.error(`El NCF "${data.ncf}" ya fue utilizado en otra factura de este suplidor.`);
                    return;
                }
            }
            catch {
                // Si falla la verificación, continuar con la operación
            }
        }
        setOperacionTitulo(`Aplicando RDE-${data?.noDocumento || id}`);
        operacion.ejecutar(`/RDE/${sucursalActiva}/aplicar/${id}`, handleRefresh);
    };
    const handlePostear = () => {
        if (!data)
            return;
        if (data.concepto?.noAsientos) {
            messageApi.info('El concepto no genera asientos contables.');
            return;
        }
        if (toEstadoNum(data.estado) !== 1 && toEstadoNum(data.estado) !== 3) {
            messageApi.info('Debe aplicar el documento antes de postear.');
            return;
        }
        setOperacionTitulo(`Posteando RDE-${data?.noDocumento || id}`);
        operacion.ejecutar(`/RDE/${sucursalActiva}/postear`, handleRefresh, data);
    };
    const handleDesaplicarConfirm = async (_motivo) => {
        if (!id || !data)
            return;
        setSaving(true);
        try {
            const documento = `${data.documento.codigo}-${data.noDocumento}`;
            await facturaSuplidorApi.desaplicar(sucursalActiva, documento);
            messageApi.success('Documento desaplicado exitosamente');
            setModalDesaplicarOpen(false);
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al desaplicar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleRevisado = async () => {
        if (!id)
            return;
        setSaving(true);
        try {
            await facturaSuplidorApi.revisado(sucursalActiva, parseInt(id));
            messageApi.success('Documento marcado como revisado');
            handleRefresh();
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
            await facturaSuplidorApi.reversar(sucursalActiva, parseInt(id));
            messageApi.success('Documento reversado exitosamente');
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al reversar');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleRecalcular = async () => {
        if (!id || !data)
            return;
        const confirmed = await new Promise((resolve) => {
            Modal.confirm({
                title: 'Recalcular',
                icon: _jsx(ExclamationCircleOutlined, {}),
                content: '¿Desea recalcular los pagos de este documento?',
                okText: 'Sí, recalcular',
                cancelText: 'No',
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
        if (!confirmed)
            return;
        setRecalculando(true);
        try {
            await apiClient.put(`/Transaccion/${sucursalActiva}/recalcularPagos/${id}`);
            messageApi.success('Documento recalculado correctamente');
            handleRefresh();
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al recalcular';
            messageApi.error(msg);
        }
        finally {
            setRecalculando(false);
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
            await facturaSuplidorApi.anular(sucursalActiva, dto);
            messageApi.success('Documento anulado exitosamente');
            setModalAnularOpen(false);
            handleRefresh();
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al anular');
            messageApi.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    function extraerMensajeError(err, fallback) {
        const responseData = err?.response?.data;
        if (!responseData)
            return fallback;
        if (responseData.errorMessage)
            return responseData.errorMessage;
        if (responseData.errors && typeof responseData.errors === 'object') {
            const mensajes = [];
            for (const key of Object.keys(responseData.errors)) {
                const val = responseData.errors[key];
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
        return _jsx(ErrorDetalle, { rutaVolver: "/FRDE", onRecargar: handleRefresh });
    }
    if (!data) {
        return null;
    }
    const documentoActivo = mostrandoReverso && reversoData ? reversoData : data;
    const isLarge = screens.xxl === true;
    const estadoInfo = resolveEstado(documentoActivo.estado);
    const esCerrado = toPeriodoNum(documentoActivo.periodo) === 6;
    const tienePagos = pagosAsociados.length > 0;
    // NOTA: el campo `pagado` de transaccionesAsociadas viene en 0; el monto realmente aplicado
    // (coincide con CTRANSAC.ACREDITADO) esta en `monto` (y opcionalmente `descuento`).
    const totalPagado = (documentoActivo?.transaccionesAsociadas || []).reduce((s, t) => s + (t.monto || 0) + (t.descuento || 0), 0);
    const totalPendiente = Math.max(0, (documentoActivo?.total || 0) - totalPagado);
    const detallesFuente = documentoActivo?.entradaAlmacen?.detalles?.length
        ? documentoActivo.entradaAlmacen.detalles
        : (documentoActivo?.detalles || []);
    const usandoEntrada = !!(documentoActivo?.entradaAlmacen?.detalles?.length);
    const detallesFiltrados = detalleSearch
        ? detallesFuente.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return ((d.codigo || '').toLowerCase().includes(q) ||
                (d.articulo || '').toLowerCase().includes(q) ||
                (d.referencia || '').toLowerCase().includes(q));
        })
        : detallesFuente;
    // asientoColumns reemplazado por AsientosContableTable compartido
    const detalleColumns = [
        {
            title: 'Código',
            key: 'codigo',
            width: 100,
            fixed: 'left',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column' }, children: [_jsx("span", { children: record.codigo || '-' }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }, children: record.referencia }) }))] })),
        },
        {
            title: 'Artículo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column' }, children: [_jsx("span", { children: toTitleCase(record.articulo || '') }), record.familia?.nombre && (_jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px', marginTop: 4, width: 'fit-content' }, children: toTitleCase(record.familia.nombre) }))] })),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { children: formatNumber(record.cantidad || 0) }), _jsx(Tooltip, { title: record.medida?.nombre || '', children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, marginTop: 'auto' }, children: record.medida?.nombre || '' }) })] })),
        },
        {
            title: 'Costo',
            key: 'costo',
            width: 110,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['md', 'lg', 'xl', 'xxl'],
            render: (_, record) => {
                const factor = Number(record.medida?.factor) || 1;
                return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { children: formatNumber(record.costo || 0) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: factor > 1 ? `${formatNumber((record.costo || 0) / factor)} × ${factor}` : '' })] }));
            },
        },
        {
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsxs("div", { children: [formatNumber(record.porcentajeDescuento || 0), "%"] }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: formatNumber(record.descuento || 0) })] })),
        },
        {
            title: 'Impuestos',
            key: 'impuestos',
            width: 140,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => (_jsxs("div", { children: [_jsx("div", { children: formatNumber(record.impuestos || 0) }), record.impuesto?.nombre && (_jsx(Tooltip, { title: record.impuesto.nombre, children: _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: toTitleCase(record.impuesto.nombre) }) }))] })),
        },
        {
            title: 'Otros',
            key: 'otros',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            responsive: ['lg', 'xl', 'xxl'],
            render: (_, record) => {
                const base = (record.subTotal || 0) - (record.descuento || 0);
                // Sumar solo impuestos informativos que el detalle tenga en impuestosDetalle
                const otrosPct = data?.impuestosFactura
                    ?.filter((imp) => {
                    const t = imp.tipo || imp.impuesto?.tipo || '';
                    const esInfo = t === 'V' || t === 'Informativo' || t === 3;
                    if (!esInfo || !record.impuestosDetalle)
                        return false;
                    return record.impuestosDetalle.some((idt) => {
                        return idt.impuestoID > 0 && idt.impuestoID === Number(imp.idExterno || imp.impuesto?.idExterno);
                    });
                })
                    ?.reduce((sum, imp) => sum + (imp.impuesto?.porcentaje || 0), 0) || 0;
                const otros = Math.round(base * (otrosPct / 100) * 100) / 100;
                return _jsx("span", { children: formatNumber(otros) });
            },
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, record) => {
                const base = (record.subTotal || 0) - (record.descuento || 0);
                // Sumar solo impuestos informativos que el detalle tenga en impuestosDetalle
                const otrosPct = data?.impuestosFactura
                    ?.filter((imp) => {
                    const t = imp.tipo || imp.impuesto?.tipo || '';
                    const esInfo = t === 'V' || t === 'Informativo' || t === 3;
                    if (!esInfo || !record.impuestosDetalle)
                        return false;
                    return record.impuestosDetalle.some((idt) => {
                        return idt.impuestoID > 0 && idt.impuestoID === Number(imp.idExterno || imp.impuesto?.idExterno);
                    });
                })
                    ?.reduce((sum, imp) => sum + (imp.impuesto?.porcentaje || 0), 0) || 0;
                const otros = Math.round(base * (otrosPct / 100) * 100) / 100;
                return (_jsx(Typography.Text, { strong: true, children: formatNumber((record.total || 0) + otros) }));
            },
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de factura suplidor", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(DetalleToolbar, { modulo: "FRDE", estado: documentoActivo.estado, periodo: documentoActivo.periodo, revisado: documentoActivo.revisado, saving: saving, imprimiendo: imprimiendo, operacionLoading: operacion?.loading, onVolver: () => navigate(-1), onImprimir: async () => {
                    setImprimiendo(true);
                    try {
                        try {
                            await documentoImpresionApi.marcarImpreso('RDE', sucursalActiva, parseInt(id));
                        }
                        catch (errImprimir) {
                            messageApi.error(errImprimir?.response?.data?.errorMessage || errImprimir?.response?.data?.ErrorMessage || 'Error al marcar el documento como impreso');
                            return;
                        }
                        const res = await apiClient.get(`/reportes/contabilidad/facturaSuplidor/${sucursalActiva}/${id}`, {
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
                }, onEditar: () => navigate(`/FRDE/${id}/editar`), onAplicar: handleAplicar, onAnular: tienePagos ? undefined : async () => setModalAnularOpen(true), onPostear: data.concepto?.noAsientos ? undefined : handlePostear, onRevisado: handleRevisado, onDesaplicar: tienePagos ? undefined : async () => setModalDesaplicarOpen(true), onReversar: handleReversar, extraButtons: _jsxs(_Fragment, { children: [toEstadoNum(data?.estado) === 3 && reversoData && (_jsx(Switch, { checked: mostrandoReverso, checkedChildren: "Reverso", unCheckedChildren: "Original", onChange: (checked) => setMostrandoReverso(checked), style: { marginLeft: 8 } })), _jsx(PermissionGate, { permisoEspecial: "pe_recalcular", children: _jsx(Button, { icon: _jsx(RedoOutlined, {}), onClick: handleRecalcular, loading: recalculando, disabled: toEstadoNum(data.estado) !== 1, children: "Recalcular" }) })] }) }), mostrandoReverso && (_jsx(Alert, { message: "Viendo documento de Reverso", description: "Este documento es el reverso generado al anular el documento original.", type: "info", showIcon: true, style: { marginBottom: 16 } })), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 3, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Entrada Ref", children: documentoActivo.entradaAlmacen?.noDocumento || '-' }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Fecha Doc. Suplidor", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Fecha Recibo", children: documentoActivo.entradaAlmacen?.fechaEntrega ? formatDate(documentoActivo.entradaAlmacen.fechaEntrega) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: toTitleCase(documentoActivo.entradaAlmacen?.almacen?.nombre || documentoActivo.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal", children: documentoActivo.sucursal?.nombre || documentoActivo.sucursal?.codigo || '-' }), _jsx(Descriptions.Item, { label: "Nota", span: 3, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "articulos", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar art\u00EDculo...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                        setDetalleSearch(''); } }), items: [
                                    {
                                        key: 'articulos',
                                        label: `Artículos (${detallesFiltrados.length}${usandoEntrada ? '' : (detalleSearch ? `/${detallesFuente.length}` : '')})`,
                                        children: (_jsxs(_Fragment, { children: [usandoEntrada && (_jsx(Alert, { type: "info", showIcon: true, style: { marginBottom: 12 }, message: _jsxs("span", { children: ["Mostrando detalles desde", ' ', _jsxs("a", { className: "paces-doc-link", onClick: () => navigate(`/FENP/${documentoActivo.entradaAlmacen.id}`), children: ["ENP-", documentoActivo.entradaAlmacen.noDocumento] })] }) })), _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 800 } })] })),
                                    },
                                    {
                                        key: 'documentos',
                                        label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                        children: (_jsx(TransaccionesAsociadasCard, { documentos: documentoActivo?.transaccionesAsociadas || [], readOnly: false })),
                                    },
                                    {
                                        key: 'asientos',
                                        label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                        children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })),
                                    },
                                    {
                                        key: 'impuestos',
                                        label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                        children: (_jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] })),
                                    },
                                    {
                                        key: 'historial',
                                        label: `Historial (${documentoActivo.logs?.length || 0})`,
                                        children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                                    },
                                ] })] }), _jsxs(Col, { xxl: 6, children: [_jsx(EntidadCard, { entidad: documentoActivo.suplidor, entidadSecundaria: documentoActivo.entidad, fallbackTitulo: "Suplidor" }), _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total, alignRight: false, pagado: totalPagado, pendiente: totalPendiente, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1, impuestosInformativos: (data?.impuestosFactura || [])
                                    .filter((imp) => {
                                    const t = imp.tipo || imp.impuesto?.tipo || '';
                                    return t === 'V' || t === 'Informativo' || t === 3;
                                })
                                    .map((imp) => ({
                                    nombre: imp.impuesto?.nombre || imp.nombre || '',
                                    monto: imp.monto || 0,
                                })) }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), _jsxs(Space, { children: [esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 14, color: '#595959' } }) })), _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label }), tieneScan === true && (_jsx(Tooltip, { title: "Ver factura escaneada", children: _jsx(Tag, { icon: _jsx(FileTextOutlined, {}), color: "success", style: { cursor: 'pointer' }, onClick: handleVerScanner }) })), tieneScan === false && _jsx(Tag, { icon: _jsx(FileSearchOutlined, {}), color: "warning" })] })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Entrada Ref", children: documentoActivo.entradaAlmacen?.noDocumento || '-' }), _jsxs(Descriptions.Item, { label: "Concepto", children: [documentoActivo.concepto?.codigo ? `${documentoActivo.concepto.codigo} - ${toTitleCase(documentoActivo.concepto.nombre || '')}` : (documentoActivo.concepto?.nombre ? toTitleCase(documentoActivo.concepto.nombre) : '-'), _jsx(ConceptoInfoLabel, { concepto: documentoActivo.concepto })] }), _jsx(Descriptions.Item, { label: "Tipo", children: documentoActivo.tipo ? `${documentoActivo.tipo.codigo} - ${toTitleCase(documentoActivo.tipo.nombre)}` : '—' }), _jsx(Descriptions.Item, { label: "Fecha Doc. Suplidor", children: formatDate(documentoActivo.fechaDocumento) }), _jsx(Descriptions.Item, { label: "NCF", children: documentoActivo.ncf || '-' }), _jsx(Descriptions.Item, { label: "Referencia", children: documentoActivo.referencia || '-' }), _jsx(Descriptions.Item, { label: "Fecha Recibo", children: documentoActivo.entradaAlmacen?.fechaEntrega ? formatDate(documentoActivo.entradaAlmacen.fechaEntrega) : '-' }), _jsx(Descriptions.Item, { label: "Almac\u00E9n", children: toTitleCase(documentoActivo.entradaAlmacen?.almacen?.nombre || documentoActivo.almacen?.nombre || '-') }), _jsx(Descriptions.Item, { label: "Sucursal", children: documentoActivo.sucursal?.nombre || documentoActivo.sucursal?.codigo || '-' }), _jsx(Descriptions.Item, { label: "Nota", children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: documentoActivo.nota || '-' }) })] }) }), _jsx(Tabs, { defaultActiveKey: "articulos", type: "card", tabBarExtraContent: _jsx(Input.Search, { placeholder: "Buscar art\u00EDculo...", allowClear: true, style: { width: 320 }, onSearch: (value) => setDetalleSearch(value), onChange: (e) => { if (!e.target.value)
                                setDetalleSearch(''); } }), items: [
                            {
                                key: 'articulos',
                                label: `Artículos (${detallesFiltrados.length}${usandoEntrada ? '' : (detalleSearch ? `/${detallesFuente.length}` : '')})`,
                                children: (_jsxs(_Fragment, { children: [usandoEntrada && (_jsx(Alert, { type: "info", showIcon: true, style: { marginBottom: 12 }, message: _jsxs("span", { children: ["Mostrando detalles desde", ' ', _jsxs("a", { className: "paces-doc-link", onClick: () => navigate(`/FENP/${documentoActivo.entradaAlmacen.id}`), children: ["ENP-", documentoActivo.entradaAlmacen.noDocumento] })] }) })), _jsx(Table, { dataSource: detallesFiltrados, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 800 } })] })),
                            },
                            {
                                key: 'documentos',
                                label: `Documentos (${documentoActivo?.transaccionesAsociadas?.length || 0})`,
                                children: (_jsx(TransaccionesAsociadasCard, { documentos: documentoActivo?.transaccionesAsociadas || [], readOnly: false })),
                            },
                            {
                                key: 'asientos',
                                label: `Asientos (${documentoActivo.asientos?.length || 0})`,
                                children: (_jsx(AsientosContableTable, { asientos: documentoActivo.asientos || [], scroll: { x: 600 }, rowKey: (r) => r.id || r.asientoID })),
                            },
                            {
                                key: 'impuestos',
                                label: `Impuestos (${documentoActivo.impuestosFactura?.length || 0})`,
                                children: (_jsx(TablaImpuestosDetalle, { dataSource: documentoActivo.impuestosFactura || [] })),
                            },
                            {
                                key: 'historial',
                                label: `Historial (${documentoActivo.logs?.length || 0})`,
                                children: (_jsx(LogTable, { dataSource: documentoActivo.logs || [], scroll: { x: 900 } })),
                            },
                        ] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: documentoActivo.subTotal, descuento: documentoActivo.descuento, impuestos: documentoActivo.impuestos, retenciones: documentoActivo.retenciones ?? 0, total: documentoActivo.total, alignRight: true, pagado: totalPagado, pendiente: totalPendiente, monedaSimbolo: documentoActivo.moneda?.simbolo || monedaDefault.simbolo, monedaNombre: documentoActivo.moneda?.nombre || monedaDefault.nombre, tasa: documentoActivo.tasa ?? 1, impuestosInformativos: (data?.impuestosFactura || [])
                                .filter((imp) => {
                                const t = imp.tipo || imp.impuesto?.tipo || '';
                                return t === 'V' || t === 'Informativo' || t === 3;
                            })
                                .map((imp) => ({
                                nombre: imp.impuesto?.nombre || imp.nombre || '',
                                monto: imp.monto || 0,
                            })) }) }), _jsx(DocumentosRelacionadosCard, { documentos: documentosRelacionados, currentId: data?.id })] })), _jsx(ModalVisorScanner, { open: scannerModalOpen, titulo: "Factura Escaneada", url: scannerUrl, loading: scannerLoading, onClose: () => { setScannerModalOpen(false); setScannerUrl(null); } }), _jsx(ModalAnular, { open: modalAnularOpen, onClose: () => setModalAnularOpen(false), onConfirm: handleAnularConfirm, documento: `${data.documento.codigo}-${data.noDocumento}`, fechaDocumento: data.fechaDocumento, periodoCerrado: toPeriodoNum(data.periodo) === 6 }), _jsx(ModalDesaplicar, { open: modalDesaplicarOpen, onClose: () => setModalDesaplicarOpen(false), onConfirm: handleDesaplicarConfirm, tituloDocumento: `${data.documento.codigo}-${data.noDocumento}` }), _jsx(ModalProgreso, { open: operacion.loading || !!operacion.completado, titulo: operacionTitulo, eventos: operacion.eventos, completado: operacion.completado, balanceInfo: operacion.balanceInfo, onClose: () => operacion.reset() })] }));
};
export default FacturaSuplidorDetalle;
