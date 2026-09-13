import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Spin, Button, Space, Row, Col, Grid, message, Form, Input, DatePicker, Typography, Modal, Alert, Select, Empty, } from 'antd';
import { SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import { conceptosApi } from '../../api/conceptosApi';
import { Sucursal } from '../../types/auth';
import PermissionGate from '../../components/PermissionGate';
const { Text } = Typography;
const { TextArea } = Input;
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function parseDateRaw(val) {
    if (!val)
        return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
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
function filaVacia(orden) {
    return {
        id: `nuevo-${orden}`,
        orden,
        codigoProducto: '',
        descripcion: '',
        referencia: '',
    };
}
const PlantillaSuplidorFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [suplidores, setSuplidores] = useState([]);
    const [form] = Form.useForm();
    const navigationConfirmedRef = useRef(false);
    const isLarge = screens.xxl === true;
    const pageTitle = mode === 'crear' ? 'Nueva Plantilla de Suplidor' : 'Editar Plantilla de Suplidor';
    // ===== Cargar datos si es edición =====
    useEffect(() => {
        setActiveModule('mplantillasup');
        setPageTitleOverride(pageTitle);
        if (mode === 'crear') {
            form.setFieldsValue({ fecha: dayjs() });
        }
        conceptosApi.obtenerSuplidores(Sucursal.Compra)
            .then(setSuplidores)
            .catch(() => message.error('Error al cargar suplidores'));
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, pageTitle]);
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar Plantilla #${res.numero}`);
            setDetalles(res.detalles || []);
            const fechaVal = res.fecha ? parseDateRaw(res.fecha) : null;
            form.setFieldsValue({
                numero: res.numero || '',
                fecha: fechaVal ? dayjs(fechaVal) : dayjs(),
                codigoSuplidor: res.codigoSuplidor || '',
                nombreSuplidor: res.nombreSuplidor || '',
                notas: res.notas || '',
            });
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar la plantilla');
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/mplantillasup', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);
    // ===== Bloqueo de salida =====
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);
    useEffect(() => {
        const handlePopState = () => {
            const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
            if (!leave) {
                window.history.pushState(null, '', window.location.pathname);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    useEffect(() => {
        const originalPushState = window.history.pushState.bind(window.history);
        window.history.pushState = function (data, unused, url) {
            const currentPath = window.location.pathname;
            const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
            if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
                const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
                if (!leave)
                    return;
                navigationConfirmedRef.current = true;
            }
            return originalPushState(data, unused, url);
        };
        return () => {
            window.history.pushState = originalPushState;
        };
    }, []);
    // ===== Handlers =====
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Sí, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                navigate('/mplantillasup', { replace: true });
            },
        });
    };
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!values.numero)
            return 'El número es requerido';
        if (!values.nombreSuplidor)
            return 'El nombre del suplidor es requerido';
        if (detalles.length === 0)
            return 'Debe agregar al menos un detalle';
        const incompletos = detalles.some((d) => !d.codigoProducto || !d.descripcion);
        if (incompletos)
            return 'Todos los detalles deben tener código de producto y descripción';
        return null;
    };
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const fechaStr = values.fecha
            ? (typeof values.fecha === 'object' && values.fecha.toDate
                ? toISOFormat(values.fecha.toDate())
                : values.fecha)
            : toISOFormat(new Date());
        return {
            id: base.id || '',
            numero: values.numero || '',
            fecha: fechaStr,
            codigoSuplidor: values.codigoSuplidor || '',
            nombreSuplidor: values.nombreSuplidor || '',
            notas: values.notas || '',
            detalles: detalles.map((d, idx) => ({
                ...d,
                orden: idx + 1,
            })),
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
                const nuevoId = await plantillaSuplidorApi.crear(sucursalActiva, dto);
                message.success('Plantilla creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/mplantillasup/${nuevoId}`, { replace: true });
            }
            else {
                await plantillaSuplidorApi.actualizar(sucursalActiva, dto);
                message.success('Plantilla actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/mplantillasup/${id}`, { replace: true });
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
    // ===== Handlers de detalles =====
    const handleAgregarFila = () => {
        setDetalles((prev) => [...prev, filaVacia(prev.length + 1)]);
    };
    const handleEliminarFila = (index) => {
        setDetalles((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.map((d, i) => ({ ...d, orden: i + 1 }));
        });
    };
    const handleDetalleChange = (index, field, value) => {
        setDetalles((prev) => prev.map((d, i) => (i !== index ? d : { ...d, [field]: value })));
    };
    // ===== Loading state =====
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando plantilla..." })] }));
    }
    // ===== Columnas de detalle editable =====
    const detalleColumns = [
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 70,
            align: 'right',
            onCell: () => ({ style: { paddingLeft: 16 } }),
            onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Código Producto',
            dataIndex: 'codigoProducto',
            key: 'codigoProducto',
            width: 150,
            render: (_, __, index) => (_jsx(Input, { size: "small", value: detalles[index]?.codigoProducto || '', onChange: (e) => handleDetalleChange(index, 'codigoProducto', e.target.value), placeholder: "C\u00F3digo" })),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            ellipsis: true,
            render: (_, __, index) => (_jsx(Input, { size: "small", value: detalles[index]?.descripcion || '', onChange: (e) => handleDetalleChange(index, 'descripcion', e.target.value), placeholder: "Descripci\u00F3n del producto" })),
        },
        {
            title: 'Referencia',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 130,
            render: (_, __, index) => (_jsx(Input, { size: "small", value: detalles[index]?.referencia || '', onChange: (e) => handleDetalleChange(index, 'referencia', e.target.value), placeholder: "Referencia" })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 60,
            onCell: () => ({ style: { paddingRight: 16 } }),
            onHeaderCell: () => ({ style: { paddingRight: 16 } }),
            render: (_, __, index) => (_jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarFila(index) })),
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar formulario de plantilla", type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [_jsx(PermissionGate, { accion: id ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: handleGuardar, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelar, children: "Cancelar" })] })] }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "numero", label: "N\u00FAmero", rules: [{ required: true, message: 'El número es requerido' }], children: _jsx(Input, { placeholder: "N\u00FAmero de plantilla" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fecha", label: "Fecha", rules: [{ required: true, message: 'La fecha es requerida' }], children: _jsx(DatePicker, { format: "YYYY-MM-DD", style: { width: '100%' }, disabledDate: (current) => {
                                                            if (!current)
                                                                return false;
                                                            const cierre = fechasCierre?.[sucursalActiva];
                                                            if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                                return true;
                                                            const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                            if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                                return true;
                                                            return false;
                                                        } }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 8, children: [_jsx(Form.Item, { name: "codigoSuplidor", label: "Suplidor", rules: [{ required: true, message: 'El suplidor es requerido' }], children: _jsx(Select, { showSearch: true, placeholder: "Buscar suplidor...", optionFilterProp: "label", onChange: (value, option) => {
                                                                form.setFieldsValue({ nombreSuplidor: option?.label || '' });
                                                            }, options: suplidores.map((s) => ({
                                                                value: s.codigo,
                                                                label: `${s.codigo} - ${s.nombre}`,
                                                            })) }) }), _jsx(Form.Item, { name: "nombreSuplidor", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "notas", label: "Notas", children: _jsx(TextArea, { rows: 2, placeholder: "Notas opcionales" }) }) })] }) }) }), _jsxs(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Detalles" }), style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 12 }, children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar producto" }) }), _jsx(Table, { dataSource: detalles, columns: detalleColumns, rowKey: (r, idx) => r.id || `row-${idx}`, size: "small", pagination: false, scroll: { x: 650 }, locale: {
                                            emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                        } })] })] }), _jsx(Col, { xxl: 6, children: _jsx(Card, { title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Informaci\u00F3n" }), className: "paces-card", style: { marginBottom: 16 }, children: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total productos: " }), _jsx("span", { children: detalles.length })] }) }) }) })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Datos Generales" }), style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "middle", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "numero", label: "N\u00FAmero", rules: [{ required: true, message: 'El número es requerido' }], children: _jsx(Input, { placeholder: "N\u00FAmero de plantilla" }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "fecha", label: "Fecha", rules: [{ required: true, message: 'La fecha es requerida' }], children: _jsx(DatePicker, { format: "YYYY-MM-DD", style: { width: '100%' }, disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }), _jsxs(Col, { xs: 24, children: [_jsx(Form.Item, { name: "codigoSuplidor", label: "Suplidor", rules: [{ required: true, message: 'El suplidor es requerido' }], children: _jsx(Select, { showSearch: true, placeholder: "Buscar suplidor...", optionFilterProp: "label", onChange: (value, option) => {
                                                        form.setFieldsValue({ nombreSuplidor: option?.label || '' });
                                                    }, options: suplidores.map((s) => ({
                                                        value: s.codigo,
                                                        label: `${s.codigo} - ${s.nombre}`,
                                                    })) }) }), _jsx(Form.Item, { name: "nombreSuplidor", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "notas", label: "Notas", children: _jsx(TextArea, { rows: 2, placeholder: "Notas opcionales" }) }) })] }) }) }), _jsxs(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Detalles" }), style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 12 }, children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregarFila, children: "Agregar producto" }) }), _jsx(Table, { dataSource: detalles, columns: detalleColumns, rowKey: (r, idx) => r.id || `row-${idx}`, size: "small", pagination: false, scroll: { x: 650 }, locale: {
                                    emptyText: (_jsx("div", { style: { minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "Sin registros" }) })),
                                } })] })] }))] }));
};
export default PlantillaSuplidorFormulario;
