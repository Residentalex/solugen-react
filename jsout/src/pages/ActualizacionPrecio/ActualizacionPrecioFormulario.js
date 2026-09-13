import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Button, Space, Row, Col, Grid, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, message, Alert, Spin, Switch, } from 'antd';
import { PlusOutlined, SaveOutlined, CloseOutlined, SearchOutlined, DeleteOutlined, ExclamationCircleOutlined, } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import TotalesCard from '../../components/TotalesCard';
import { formatNumber, toTitleCase, extraerMensajeError, toISOFormat } from '../../utils/formats';
const { Text } = Typography;
const { TextArea } = Input;
const ESTADO_TAG = {
    Pendiente: { color: 'warning', label: 'Pendiente' },
    P: { color: 'warning', label: 'Pendiente' },
    Aplicado: { color: 'success', label: 'Aplicado' },
    A: { color: 'success', label: 'Aplicado' },
    Anulado: { color: 'error', label: 'Anulado' },
    N: { color: 'error', label: 'Anulado' },
};
const BASE_OPTIONS = [
    { value: 'Precio', label: 'Precio' },
    { value: 'Costo', label: 'Costo' },
];
function lineaVacia() {
    return {
        codPro: '',
        descripcion: '',
        precio: 0,
        pAumento: 0,
        aumento: 0,
        precioSug: 0,
        marcada: false,
        costoPiv: 0,
        pMargen: 0,
        impMargen: 0,
        pMargPM: 0,
        precioMinSug: 0,
        precioMin: 0,
    };
}
const ActualizacionPrecioFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const screens = Grid.useBreakpoint();
    const mode = id ? 'editar' : 'crear';
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    const [lineas, setLineas] = useState([]);
    const [productoModalOpen, setProductoModalOpen] = useState(false);
    const [form] = Form.useForm();
    const navigationConfirmedRef = useRef(false);
    const isLarge = screens.xxl === true;
    // ===== Carga inicial =====
    useEffect(() => {
        setActiveModule('FActPrecio');
        const pageTitle = mode === 'crear' ? 'Nueva Actualización de Precio' : '';
        setPageTitleOverride(pageTitle);
        // Inicializar valores por defecto en modo crear
        if (mode === 'crear') {
            form.setFieldsValue({
                fecha: dayjs(),
                fechaParaAplicar: dayjs(),
                redondear: false,
                ajuste: 0,
                base: 'Precio',
                porPivote: 0,
                porPrecioMin: 0,
                precioAct: true,
                todosAlm: false,
                todasFam: false,
                docReferencia: '',
            });
        }
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);
    // ===== Cargar datos si es edición =====
    useEffect(() => {
        if (mode === 'crear')
            return;
        if (!id)
            return;
        setLoading(true);
        actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
            .then((res) => {
            setData(res);
            setPageTitleOverride(`Editar - ${res.documento}`);
            setLineas(res.lineas.map((l) => ({
                codPro: l.codPro,
                descripcion: l.descripcion,
                precio: l.precio,
                pAumento: l.pAumento,
                aumento: l.aumento,
                precioSug: l.precioSug,
                marcada: l.marcada,
                costoPiv: l.costoPiv,
                pMargen: l.pMargen,
                impMargen: l.impMargen,
                pMargPM: l.pMargPM,
                precioMinSug: l.precioMinSug,
                precioMin: l.precioMin,
            })));
            form.setFieldsValue({
                fecha: res.fecha ? dayjs(res.fecha) : dayjs(),
                fechaParaAplicar: res.fechaParaAplicar ? dayjs(res.fechaParaAplicar) : dayjs(),
                almacenId: res.almacenId || undefined,
                familiaId: res.familiaId || undefined,
                docReferencia: res.docReferencia || '',
                redondear: res.redondear,
                ajuste: res.ajuste,
                base: res.base || 'Precio',
                porPivote: res.porPivote,
                porPrecioMin: res.porPrecioMin,
                precioAct: res.precioAct,
                todosAlm: res.todosAlm,
                todasFam: res.todasFam,
            });
        })
            .catch((err) => {
            const msg = extraerMensajeError(err, 'Error al cargar el documento');
            message.error(msg);
            setLoadingError(true);
            navigationConfirmedRef.current = true;
            navigate('/FActPrecio', { replace: true });
        })
            .finally(() => setLoading(false));
    }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);
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
                if (mode === 'crear') {
                    navigate('/FActPrecio', { replace: true });
                }
                else {
                    navigate(`/FActPrecio/${id}`, { replace: true });
                }
            },
        });
    };
    const validarFormulario = () => {
        if (lineas.length === 0)
            return 'Debe agregar al menos un producto';
        return null;
    };
    const construirDTO = () => {
        const values = form.getFieldsValue();
        const base = data || {};
        const fecha = values.fecha
            ? (typeof values.fecha === 'object' && values.fecha.toDate
                ? toISOFormat(values.fecha.toDate())
                : values.fecha)
            : toISOFormat(new Date());
        const fechaParaAplicar = values.fechaParaAplicar
            ? (typeof values.fechaParaAplicar === 'object' && values.fechaParaAplicar.toDate
                ? toISOFormat(values.fechaParaAplicar.toDate())
                : values.fechaParaAplicar)
            : toISOFormat(new Date());
        return {
            fecha,
            fechaParaAplicar,
            almacenId: values.almacenId || base.almacenId || undefined,
            familiaId: values.familiaId || base.familiaId || undefined,
            docReferencia: values.docReferencia || '',
            redondear: values.redondear ?? false,
            ajuste: values.ajuste ?? 0,
            base: values.base || 'Precio',
            porPivote: values.porPivote ?? 0,
            porPrecioMin: values.porPrecioMin ?? 0,
            precioAct: values.precioAct ?? true,
            todosAlm: values.todosAlm ?? false,
            todasFam: values.todasFam ?? false,
            lineas,
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
                const resultId = await actualizacionPrecioApi.crear(sucursalActiva, dto);
                message.success('Actualización de precio creada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FActPrecio/${resultId}`, { replace: true });
            }
            else {
                await actualizacionPrecioApi.actualizar(sucursalActiva, id, dto);
                message.success('Actualización de precio actualizada exitosamente');
                navigationConfirmedRef.current = true;
                navigate(`/FActPrecio/${id}`, { replace: true });
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
    const handleSeleccionarProducto = (producto) => {
        // Verificar duplicado
        const yaExiste = lineas.some((l) => l.codPro === producto.codigo);
        if (yaExiste) {
            message.warning(`El producto ${producto.codigo} ya está agregado`);
            return;
        }
        setLineas((prev) => [
            ...prev,
            {
                codPro: producto.codigo,
                descripcion: producto.articulo || producto.descripcion || '',
                precio: producto.precio || producto.costo || 0,
                pAumento: 0,
                aumento: 0,
                precioSug: producto.precio || producto.costo || 0,
                marcada: true,
                costoPiv: producto.costo || 0,
                pMargen: 0,
                impMargen: 0,
                pMargPM: 0,
                precioMinSug: producto.precio || producto.costo || 0,
                precioMin: producto.precio || producto.costo || 0,
            },
        ]);
    };
    const handleEliminarLinea = (codPro) => {
        Modal.confirm({
            title: 'Eliminar producto',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro de eliminar este producto?',
            okText: 'Sí',
            cancelText: 'No',
            okButtonProps: { danger: true },
            onOk: () => {
                setLineas((prev) => prev.filter((l) => l.codPro !== codPro));
            },
        });
    };
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando documento..." })] }));
    }
    // Totales calculados
    const totalPrecioActual = lineas.reduce((s, l) => s + (l.precio || 0), 0);
    const totalPrecioSug = lineas.reduce((s, l) => s + (l.precioSug || 0), 0);
    const totalAumento = lineas.reduce((s, l) => s + (l.aumento || 0), 0);
    const columnasLineas = [
        {
            title: 'Código',
            dataIndex: 'codPro',
            key: 'codPro',
            width: 120,
            fixed: 'left',
            render: (val) => _jsx(Text, { strong: true, children: val || '-' }),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            ellipsis: true,
            render: (val) => _jsx(Text, { children: toTitleCase(val || '') }),
        },
        {
            title: 'Precio',
            dataIndex: 'precio',
            key: 'precio',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: '% Aumento',
            key: 'pAumento',
            width: 110,
            align: 'right',
            render: (_, record, idx) => (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: record.pAumento, onChange: (val) => {
                    const aumentoPorc = val || 0;
                    const aumento = (record.precio * aumentoPorc) / 100;
                    const precioSug = record.precio + aumento;
                    setLineas((prev) => prev.map((l, i) => i === idx ? { ...l, pAumento: aumentoPorc, aumento, precioSug } : l));
                } })),
        },
        {
            title: 'Aumento',
            dataIndex: 'aumento',
            key: 'aumento',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: 'Precio Sugerido',
            dataIndex: 'precioSug',
            key: 'precioSug',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { strong: true, style: { fontFamily: 'monospace' }, children: formatNumber(val) }),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 60,
            render: (_, record) => (_jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarLinea(record.codPro) })),
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar el formulario", type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [mode === 'editar' && data && (_jsx(Tag, { color: (ESTADO_TAG[data.estado] || { color: 'default' }).color, children: data.estado })), _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: handleGuardar, children: "Guardar" }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelar, children: "Cancelar" })] })] }), isLarge ? (_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xxl: 18, children: [_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fecha", label: "Fecha", rules: [{ required: true, message: 'Requerido' }], children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                            if (!current)
                                                                return false;
                                                            const cierre = fechasCierre?.[sucursalActiva];
                                                            if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                                return true;
                                                            const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                            if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                                return true;
                                                            return false;
                                                        } }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaParaAplicar", label: "Fecha para Aplicar", rules: [{ required: true, message: 'Requerido' }], children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                            if (!current)
                                                                return false;
                                                            const cierre = fechasCierre?.[sucursalActiva];
                                                            if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                                return true;
                                                            const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                            if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                                return true;
                                                            return false;
                                                        } }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "docReferencia", label: "Doc. Referencia", children: _jsx(Input, { placeholder: "Documento de referencia" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "base", label: "Base", rules: [{ required: true, message: 'Requerido' }], children: _jsx(Select, { options: BASE_OPTIONS }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "ajuste", label: "Ajuste %", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "porPivote", label: "% Pivote", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "porPrecioMin", label: "% Precio M\u00EDn", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "almacenId", label: "Almac\u00E9n", children: _jsx(Input, { placeholder: "ID del almac\u00E9n" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "familiaId", label: "Familia", children: _jsx(Input, { placeholder: "ID de la familia" }) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 8, children: _jsx(Form.Item, { name: "redondear", label: "Redondear", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 8, children: _jsx(Form.Item, { name: "todosAlm", label: "Todos Almacenes", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 8, children: _jsx(Form.Item, { name: "todasFam", label: "Todas Familias", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 8, children: _jsx(Form.Item, { name: "precioAct", label: "Precio Actual", valuePropName: "checked", children: _jsx(Switch, {}) }) })] }) }) }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar Producto" }), _jsxs(Text, { type: "secondary", style: { fontSize: 13 }, children: [lineas.length, " producto(s)"] })] }), _jsx(Table, { dataSource: lineas, columns: columnasLineas, rowKey: "codPro", size: "small", pagination: false, scroll: { x: 1100 }, locale: { emptyText: 'No hay productos agregados' } })] })] }), _jsx(Col, { xxl: 6, children: _jsx(TotalesCard, { subTotal: totalPrecioActual, descuento: 0, impuestos: 0, total: totalPrecioSug, nota: `Aumento total: ${formatNumber(totalAumento)}`, monedaSimbolo: "RD$", monedaNombre: "Peso Dominicano", tasa: 1 }) })] })) : (_jsxs("div", { children: [_jsx(Card, { className: "paces-card", size: "small", title: "Datos Generales", style: { marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "small", style: { paddingTop: 24 }, children: _jsxs(Row, { gutter: [16, 24], children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "fecha", label: "Fecha", rules: [{ required: true, message: 'Requerido' }], children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "fechaParaAplicar", label: "Fecha para Aplicar", rules: [{ required: true, message: 'Requerido' }], children: _jsx(DatePicker, { style: { width: '100%' }, format: "YYYY-MM-DD", disabledDate: (current) => {
                                                    if (!current)
                                                        return false;
                                                    const cierre = fechasCierre?.[sucursalActiva];
                                                    if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day'))
                                                        return true;
                                                    const cierreInv = fechasCierreInv?.[sucursalActiva];
                                                    if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day'))
                                                        return true;
                                                    return false;
                                                } }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "docReferencia", label: "Doc. Referencia", children: _jsx(Input, { placeholder: "Documento de referencia" }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "base", label: "Base", rules: [{ required: true, message: 'Requerido' }], children: _jsx(Select, { options: BASE_OPTIONS }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "ajuste", label: "Ajuste %", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "porPivote", label: "% Pivote", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "porPrecioMin", label: "% Precio M\u00EDn", children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, step: 0.01, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "almacenId", label: "Almac\u00E9n", children: _jsx(Input, { placeholder: "ID del almac\u00E9n" }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "familiaId", label: "Familia", children: _jsx(Input, { placeholder: "ID de la familia" }) }) }), _jsx(Col, { xs: 12, children: _jsx(Form.Item, { name: "redondear", label: "Redondear", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, children: _jsx(Form.Item, { name: "todosAlm", label: "Todos Almacenes", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, children: _jsx(Form.Item, { name: "todasFam", label: "Todas Familias", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, children: _jsx(Form.Item, { name: "precioAct", label: "Precio Actual", valuePropName: "checked", children: _jsx(Switch, {}) }) })] }) }) }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setProductoModalOpen(true), children: "Agregar Producto" }), _jsxs(Text, { type: "secondary", style: { fontSize: 13 }, children: [lineas.length, " producto(s)"] })] }), _jsx(Table, { dataSource: lineas, columns: columnasLineas, rowKey: "codPro", size: "small", pagination: false, scroll: { x: 1100 }, locale: { emptyText: 'No hay productos agregados' } })] }), _jsx("div", { style: { marginTop: 24 }, children: _jsx(TotalesCard, { subTotal: totalPrecioActual, descuento: 0, impuestos: 0, total: totalPrecioSug, alignRight: true, nota: `Aumento total: ${formatNumber(totalAumento)}`, monedaSimbolo: "RD$", monedaNombre: "Peso Dominicano", tasa: 1 }) })] })), _jsx(BuscarProductoModal, { open: productoModalOpen, onClose: () => setProductoModalOpen(false), onSelect: handleSeleccionarProducto, mode: "inventario" })] }));
};
export default ActualizacionPrecioFormulario;
