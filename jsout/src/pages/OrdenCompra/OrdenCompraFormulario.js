import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Spin, Button, Space, Row, Col, Divider, message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import CampoTipo from '../../components/CampoTipo/CampoTipo';
import { Sucursal } from '../../types/auth';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { conceptosApi } from '../../api/conceptosApi';
import { proveedorApi } from '../../api/proveedorApi';
import { apiClient } from '../../api/client';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatNumber } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import PermissionGate from '../../components/PermissionGate';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';
const { Text } = Typography;
const { TextArea } = Input;
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function toISOFormat(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
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
function filaVacia() {
    return {
        id: 0,
        codigo: '',
        articulo: '',
        referencia: '',
        cantidad: 0,
        costo: 0,
        subTotal: 0,
        descuento: 0,
        porcentajeDescuento: 0,
        impuestos: 0,
        porcentajeImpuesto: 0,
        total: 0,
        cantidadBonificable: 0,
        tipoArticulo: 'Producto',
        medida: undefined,
    };
}
function calcularFila(fila) {
    const cantidad = fila.cantidad || 0;
    const costo = fila.costo || 0;
    const pctDesc = fila.porcentajeDescuento || 0;
    const subTotal = Math.round(cantidad * costo * 100) / 100;
    const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
    const total = Math.round((subTotal - descuento) * 100) / 100;
    return { ...fila, subTotal, descuento, total };
}
const OrdenCompraFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const mode = id ? 'editar' : 'crear';
    const { screenCode, documentCode } = useScreenConfig('FORC');
    const destino = Sucursal.Compra;
    const navigationConfirmedRef = useFormularioNavigation();
    const impuestosBackupRef = useRef(new Map());
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [selectedConcepto, setSelectedConcepto] = useState(null);
    const [conceptoSearchText, setConceptoSearchText] = useState('');
    const [selectedSuplidor, setSelectedSuplidor] = useState(null);
    const [suplidoresCache, setSuplidoresCache] = useState([]);
    const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
    const [sucursalDestino, setSucursalDestino] = useState(undefined);
    const [form] = Form.useForm();
    useEffect(() => {
        setActiveModule(screenCode);
        const pageTitle = mode === 'crear' ? 'Nueva Orden de Compra' : 'Editar Orden de Compra';
        setPageTitleOverride(pageTitle);
        if (mode === 'crear') {
            form.setFieldsValue({ fechaDocumento: dayjs() });
        }
        return () => { resetToolbar(); setPageTitleOverride(''); };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((_res) => {
            const res = _res;
            setData(res);
            const detallesMap = (res.detalles || []).map((d, idx) => ({
                id: -(idx + 1),
                codigo: d.codigo || '',
                articulo: d.articulo || '',
                referencia: d.referencia || '',
                cantidad: d.cantidad || 0,
                costo: d.costo || 0,
                subTotal: d.subTotal || 0,
                descuento: d.descuento || 0,
                porcentajeDescuento: d.porcentajeDescuento || 0,
                impuestos: d.impuestos || 0,
                porcentajeImpuesto: d.porcentajeImpuesto || 0,
                total: d.total || 0,
                cantidadBonificable: d.cantidadBonificable || 0,
                tipoArticulo: d.tipoArticulo || 'Producto',
                medida: d.medida || undefined,
            }));
            setDetalles(detallesMap);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedSuplidor(res.suplidor || null);
            form.setFieldsValue({
                conceptoNombre: res.concepto?.nombre || '',
                suplidor: res.suplidor?.codigo || '',
                fechaDocumento: res.fechaDocumento ? dayjs(res.fechaDocumento) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                nota: res.nota || '',
                diasCredito: res.diasCredito || 0,
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar la orden';
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FORC', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate]);
    useEffect(() => {
        // Cargar suplidores para el selector
        proveedorApi.obtenerListado(sucursalActiva)
            .then(setSuplidoresCache)
            .catch((err) => console.warn('Error al cargar suplidores cache', err));
    }, [sucursalActiva]);
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Si, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                if (mode === 'crear') {
                    navigate('/FORC', { replace: true });
                }
                else if (id) {
                    navigate(`/FORC/${id}`, { replace: true });
                }
            },
        });
    };
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!selectedConcepto)
            return 'El concepto es requerido';
        if (!values.suplidor)
            return 'El suplidor es requerido';
        if (detalles.length === 0)
            return 'Debe agregar al menos un detalle';
        if (!detalles.some((d) => (d.cantidad || 0) > 0))
            return 'Debe tener al menos un detalle con cantidad > 0';
        return null;
    };
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const fechaDoc = values.fechaDocumento
            ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
                ? toISOFormat(values.fechaDocumento.toDate())
                : values.fechaDocumento)
            : toISOFormat(new Date());
        const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
        const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
        const total = Math.round((totalSub - totalDesc) * 100) / 100;
        return {
            id: base.id || 0,
            fechaDocumento: fechaDoc,
            noDocumento: base.noDocumento || values.noDocumento || '',
            estado: base.estado || 0,
            periodo: base.periodo || 0,
            ncf: values.ncf || '',
            referencia: values.referencia || '',
            nota: values.nota || '',
            total: total,
            subTotal: totalSub,
            descuento: totalDesc,
            impuestos: 0,
            retenciones: 0,
            diasCredito: values.diasCredito || 0,
            tasa: 1,
            concepto: selectedConcepto ? { codigo: selectedConcepto.codigo, nombre: selectedConcepto.nombre } : { codigo: '', nombre: '' },
            suplidor: selectedSuplidor ? { codigo: selectedSuplidor.codigo, nombre: selectedSuplidor.nombre, identificacion: selectedSuplidor.identificacion || '' } : { codigo: '', nombre: '', identificacion: '' },
            entidad: selectedSuplidor ? { codigo: selectedSuplidor.codigo, nombre: selectedSuplidor.nombre, identificacion: selectedSuplidor.identificacion || '' } : { codigo: '', nombre: '', identificacion: '' },
            moneda: base.moneda || getMonedaSucursalActiva(),
            detalles: detalles.map(calcularFila),
            asientos: base.asientos || [],
            logs: base.logs || [],
        };
    };
    const handleGuardar = async () => {
        const error = validarFormulario();
        if (error) {
            message.error(error);
            return;
        }
        setSaving(true);
        try {
            const dto = construirDTO();
            if (mode === 'crear') {
                const { data: result } = await apiClient.post(`/ORC/${sucursalActiva}?destino=${destino}`, dto);
                message.success('Orden de compra creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FORC/${result.data?.id || result.id}`, { replace: true });
            }
            else {
                await apiClient.put(`/ORC/${sucursalActiva}`, dto);
                message.success('Orden de compra actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FORC/${id}`, { replace: true });
            }
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al guardar');
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    const handleAgregarFila = () => {
        setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
    };
    const handleEliminarFila = (filaId) => {
        setDetalles((prev) => prev.filter((d) => d.id !== filaId));
    };
    const handleDetalleChange = (filaId, field, value) => {
        setDetalles((prev) => prev.map((d) => {
            if (d.id !== filaId)
                return d;
            const updated = { ...d, [field]: value };
            return calcularFila(updated);
        }));
    };
    const totales = {
        subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
        descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
        total: detalles.reduce((s, d) => s + (d.total || 0), 0),
    };
    const handleConceptoSelect = (concepto) => {
        setSelectedConcepto(concepto);
        setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
        // === ConfigurarMoneda (siempre desde concepto) ===
        const monedaObj = concepto.moneda || getMonedaSucursalActiva();
        setData((prev) => {
            if (!prev)
                return prev;
            return { ...prev, moneda: { ...monedaObj, simbolo: monedaObj.simbolo || getMonedaSucursalActiva().simbolo } };
        });
        form.setFieldsValue({
            conceptoNombre: concepto.nombre,
            moneda: monedaObj.nombre,
            tasa: monedaObj.tasa ?? 1,
        });
        // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
        const prevNoImpuesto = selectedConcepto?.noImpuesto;
        if (concepto.noImpuesto) {
            const hayImpuestos = detalles.some((d) => (d.porcentajeImpuesto || 0) > 0);
            if (hayImpuestos) {
                const backup = new Map();
                detalles.forEach((d) => {
                    if ((d.porcentajeImpuesto || 0) > 0) {
                        backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
                    }
                });
                impuestosBackupRef.current = backup;
                message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
                setDetalles((prev) => prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined })));
            }
        }
        else if (prevNoImpuesto && !concepto.noImpuesto) {
            const backup = impuestosBackupRef.current;
            if (backup.size > 0) {
                setDetalles((prev) => prev.map((d) => {
                    const saved = backup.get(d.id);
                    if (saved) {
                        return calcularFila({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
                    }
                    return d;
                }));
                impuestosBackupRef.current = new Map();
            }
        }
    };
    const handleRefresh = useCallback(() => {
        setLoadingError(false);
        if (!id)
            return;
        setLoading(true);
        ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
            .then((_res) => {
            const res = _res;
            setData(res);
            const detallesMap = (res.detalles || []).map((d, idx) => ({
                id: -(idx + 1),
                codigo: d.codigo || '',
                articulo: d.articulo || '',
                referencia: d.referencia || '',
                cantidad: d.cantidad || 0,
                costo: d.costo || 0,
                subTotal: d.subTotal || 0,
                descuento: d.descuento || 0,
                porcentajeDescuento: d.porcentajeDescuento || 0,
                impuestos: d.impuestos || 0,
                porcentajeImpuesto: d.porcentajeImpuesto || 0,
                total: d.total || 0,
                cantidadBonificable: d.cantidadBonificable || 0,
                tipoArticulo: d.tipoArticulo || 'Producto',
                medida: d.medida || undefined,
            }));
            setDetalles(detallesMap);
            setSelectedConcepto(res.concepto || null);
            setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
            setSelectedSuplidor(res.suplidor || null);
            form.setFieldsValue({
                conceptoNombre: res.concepto?.nombre || '',
                suplidor: res.suplidor?.codigo || '',
                fechaDocumento: res.fechaDocumento ? dayjs(res.fechaDocumento) : null,
                ncf: res.ncf || '',
                referencia: res.referencia || '',
                nota: res.nota || '',
                diasCredito: res.diasCredito || 0,
            });
        })
            .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al recargar';
            message.error(msg);
            setLoadingError(true);
        })
            .finally(() => setLoading(false));
    }, [id, sucursalActiva, form]);
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando orden de compra..." })] }));
    }
    const detalleColumns = [
        {
            title: 'Artículo',
            dataIndex: 'articulo',
            key: 'articulo',
            ellipsis: true,
            onCell: () => ({ style: { verticalAlign: 'top', paddingLeft: 8 } }),
            render: (_, __, idx) => (_jsxs("div", { style: { fontSize: 13 }, children: [_jsx(Input, { size: "small", placeholder: "Art\u00EDculo", value: detalles[idx]?.articulo || '', onChange: (e) => handleDetalleChange(detalles[idx].id, 'articulo', e.target.value) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, marginTop: 2 }, children: _jsx(Input, { size: "small", placeholder: "C\u00F3digo", value: detalles[idx]?.codigo || '', onChange: (e) => handleDetalleChange(detalles[idx].id, 'codigo', e.target.value) }) })] })),
        },
        {
            title: 'Cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, __, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: detalles[idx]?.cantidad, onChange: (val) => handleDetalleChange(detalles[idx].id, 'cantidad', val || 0) })),
        },
        {
            title: 'Costo',
            key: 'costo',
            width: 130,
            align: 'right',
            responsive: ['sm', 'md', 'lg'],
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, __, idx) => {
                const costoBase = Number(detalles[idx]?.costo) || 0;
                const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
                const factor = Number(detalles[idx]?.medida?.factor) || 1;
                const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
                const costoUnitario = costoConDescuento / factor;
                return (_jsxs("div", { children: [_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: detalles[idx]?.costo, onChange: (val) => handleDetalleChange(detalles[idx].id, 'costo', val || 0) }), _jsxs("div", { style: { fontSize: 11, lineHeight: 1.5, color: '#999' }, children: [formatNumber(costoUnitario), " \u00D7 ", factor] })] }));
            },
        },
        {
            title: 'Descuento %',
            key: 'descuento',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, __, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, min: 0, max: 100, step: 0.01, precision: 2, value: detalles[idx]?.porcentajeDescuento, onChange: (val) => handleDetalleChange(detalles[idx].id, 'porcentajeDescuento', val || 0), addonAfter: "%" })),
        },
        {
            title: 'SubTotal',
            key: 'subTotal',
            width: 120,
            align: 'right',
            responsive: ['md', 'lg'],
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => _jsx(Text, { children: formatNumber(record.subTotal || 0) }),
        },
        {
            title: 'Total',
            key: 'total',
            width: 120,
            align: 'right',
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_, record) => _jsx(Text, { strong: true, children: formatNumber(record.total || 0) }),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            onCell: () => ({ style: { paddingRight: 8 } }),
            render: (_, __, idx) => (_jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarFila(detalles[idx].id) })),
        },
    ];
    const renderToolbar = () => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(SucursalDocumentoSelector, { value: sucursalDestino, onChange: setSucursalDestino }), _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [_jsx(PermissionGate, { accion: mode === 'editar' ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: handleGuardar, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelar, children: "Cancelar" })] })] }));
    return (_jsxs("div", { children: [renderToolbar(), loadingError && (_jsx(Alert, { message: "Error al cargar formulario de orden de compra", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(Row, { gutter: 16, children: _jsxs(Col, { xxl: 24, xs: 24, children: [_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Form.Item, { name: "tipo", style: { marginBottom: 0 }, children: _jsx(CampoTipo, { tipoDocumento: "ORC", sucursal: sucursalActiva, disabled: true }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 6, children: [_jsxs("div", { children: [_jsx(Form.Item, { name: "conceptoNombre", style: { marginBottom: 0 }, children: _jsx(Input, { placeholder: " ", value: conceptoSearchText, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setConceptoModalOpen(true) }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, marginTop: 2 }, children: "Concepto" })] }), _jsx(Form.Item, { name: "concepto", hidden: true, children: _jsx(Input, {}) }), _jsx(ConceptoInfoLabel, { concepto: selectedConcepto })] }), _jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Form.Item, { name: "fechaDocumento", required: true, style: { marginBottom: 0 }, label: "Fecha Documento", children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                        if (!current)
                                                            return false;
                                                        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
                                                            if (current.isAfter(dayjs(), 'day'))
                                                                return true;
                                                        }
                                                        const cierre = fechasCierre?.[sucursalActiva];
                                                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                            return true;
                                                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                            return true;
                                                        return false;
                                                    } }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "suplidor", required: true, style: { marginBottom: 0 }, label: "Suplidor", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", onChange: (val) => {
                                                        const ent = suplidoresCache.find((e) => e.codigo === val);
                                                        setSelectedSuplidor(ent || null);
                                                    }, children: suplidoresCache.map((s) => (_jsxs(Select.Option, { value: s.codigo, children: [toTitleCase(s.nombre), " (", s.codigo, ")"] }, s.codigo))) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "ncf", style: { marginBottom: 0 }, label: "NCF", children: _jsx(Input, { placeholder: "NCF", maxLength: 20 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "referencia", style: { marginBottom: 0 }, label: "Referencia", children: _jsx(Input, { placeholder: "Referencia", maxLength: 50 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "diasCredito", style: { marginBottom: 0 }, label: "D\u00EDas Cr\u00E9dito", children: _jsx(InputNumber, { min: 0, style: { width: '100%' } }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", style: { marginBottom: 0 }, label: "Nota", children: _jsx(TextArea, { rows: 2, placeholder: "Nota..." }) }) })] }) }) }), _jsx(Tabs, { defaultActiveKey: "detalles", type: "card", items: [{
                                    key: 'detalles',
                                    label: `Detalles (${detalles.length})`,
                                    children: (_jsxs(_Fragment, { children: [_jsx(Button, { type: "dashed", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, style: { marginBottom: 8, width: '100%' }, children: "Agregar Fila" }), _jsx(Table, { dataSource: detalles, columns: detalleColumns, rowKey: "id", size: "small", pagination: false, scroll: { x: 1000 }, locale: {
                                                    emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                                } })] })),
                                }] })] }) }), _jsx(BuscarConceptoModal, { open: conceptoModalOpen, onClose: () => setConceptoModalOpen(false), onSelect: handleConceptoSelect, sucursal: sucursalActiva, documento: documentCode })] }));
};
export default OrdenCompraFormulario;
