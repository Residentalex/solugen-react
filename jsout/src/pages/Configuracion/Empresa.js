import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Input, DatePicker, Select, Switch, Button, message, Spin, Space, Row, Col, Grid, Descriptions, } from 'antd';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined, BankOutlined, CalendarOutlined, SettingOutlined, ShoppingCartOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { configuracionApi } from '../../api/configuracionApi';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import { extraerMensajeError } from '../../utils/formats';
const Empresa = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [data, setData] = useState(null);
    const [pedidosYaConfig, setPedidosYaConfig] = useState(null);
    const [loadingPedidosYa, setLoadingPedidosYa] = useState(false);
    const screens = Grid.useBreakpoint();
    const isLarge = screens.xxl === true;
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const config = await configuracionApi.obtener(sucursalActiva);
            if (config) {
                setData(config);
                form.setFieldsValue({
                    ...config,
                    fechaCierre: config.fechaCierre ? dayjs(config.fechaCierre) : null,
                    fechaCierreInventario: config.fechaCierreInventario ? dayjs(config.fechaCierreInventario) : null,
                    fechaCierreFiscal: config.fechaCierreFiscal ? dayjs(config.fechaCierreFiscal) : null,
                });
            }
        }
        catch (err) {
            message.error(extraerMensajeError(err, 'Error al cargar configuracion'));
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, form]);
    const cargarPedidosYa = useCallback(async () => {
        setLoadingPedidosYa(true);
        try {
            const config = await configPedidosYaApi.obtener(sucursalActiva);
            setPedidosYaConfig(config);
        }
        catch {
            setPedidosYaConfig(null);
        }
        finally {
            setLoadingPedidosYa(false);
        }
    }, [sucursalActiva]);
    useEffect(() => { cargar(); cargarPedidosYa(); }, [cargar, cargarPedidosYa]);
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const config = {
                ...values,
                fechaCierre: values.fechaCierre ? dayjs(values.fechaCierre).format('YYYYMMDDHHmmss') : null,
                fechaCierreInventario: values.fechaCierreInventario ? dayjs(values.fechaCierreInventario).format('YYYYMMDDHHmmss') : null,
                fechaCierreFiscal: values.fechaCierreFiscal ? dayjs(values.fechaCierreFiscal).format('YYYYMMDDHHmmss') : null,
            };
            await configuracionApi.guardar(sucursalActiva, config);
            message.success('Configuracion guardada correctamente');
            setData(config);
            setModoEdicion(false);
        }
        catch (err) {
            if (err.errorFields)
                return;
            message.error(extraerMensajeError(err, 'Error al guardar configuracion'));
        }
        finally {
            setSaving(false);
        }
    };
    const handleCancelarEdicion = () => {
        if (data) {
            form.setFieldsValue({
                ...data,
                fechaCierre: data.fechaCierre ? dayjs(data.fechaCierre) : null,
                fechaCierreInventario: data.fechaCierreInventario ? dayjs(data.fechaCierreInventario) : null,
                fechaCierreFiscal: data.fechaCierreFiscal ? dayjs(data.fechaCierreFiscal) : null,
            });
        }
        setModoEdicion(false);
    };
    const handleVolver = () => {
        navigate('/dashboard');
    };
    const formatFecha = (fecha) => {
        if (!fecha)
            return '-';
        const d = dayjs(fecha, 'YYYYMMDDHHmmss');
        return d.isValid() ? d.format('DD/MM/YYYY') : fecha;
    };
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando configuracion..." })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: modoEdicion ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [_jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: handleGuardar, children: "Guardar" }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelarEdicion, children: "Cancelar" })] })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: handleVolver, children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: () => setModoEdicion(true), children: "Editar" })] })) }), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, xxl: 18, children: modoEdicion ? (_jsxs(Form, { form: form, layout: "vertical", size: "small", style: { padding: 24 }, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(BankOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Datos Generales" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "nombre", label: "Nombre de la empresa", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "rnc", label: "RNC", children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "telefono", label: "Telefono", children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "fax", label: "Fax", children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "direccion", label: "Direccion", children: _jsx(Input.TextArea, { rows: 2 }) }) }), _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "slogan", label: "Slogan", children: _jsx(Input, {}) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(CalendarOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Parametros Contables" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaCierre", label: "Cierre contable", children: _jsx(DatePicker, { style: { width: '100%' } }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaCierreInventario", label: "Cierre inventario", children: _jsx(DatePicker, { style: { width: '100%' } }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "fechaCierreFiscal", label: "Cierre fiscal", children: _jsx(DatePicker, { style: { width: '100%' } }) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(SettingOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Configuracion" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "metodoFacturacionDGII", label: "Metodo de facturacion DGII", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", options: [
                                                                { value: 'Normal', label: 'Normal' },
                                                                { value: 'ConsumidorFinal', label: 'Consumidor Final' },
                                                                { value: 'eCF', label: 'eCF (Factura Electronica)' },
                                                            ] }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "orcEnUnidades", label: "ORC en unidades", valuePropName: "checked", children: _jsx(Switch, {}) }) })] }) })] })) : (_jsxs("div", { style: { padding: 24 }, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(BankOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Datos Generales" })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: data?.nombre || '-' }), _jsx(Descriptions.Item, { label: "RNC", children: data?.rnc || '-' }), _jsx(Descriptions.Item, { label: "Telefono", children: data?.telefono || '-' }), _jsx(Descriptions.Item, { label: "Fax", children: data?.fax || '-' }), _jsx(Descriptions.Item, { label: "Direccion", span: isLarge ? 3 : 1, children: _jsx("span", { style: { whiteSpace: 'pre-wrap' }, children: data?.direccion || '-' }) }), _jsx(Descriptions.Item, { label: "Slogan", span: isLarge ? 3 : 1, children: data?.slogan || '-' })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(CalendarOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Parametros Contables" })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Cierre contable", children: formatFecha(data?.fechaCierre) }), _jsx(Descriptions.Item, { label: "Cierre inventario", children: formatFecha(data?.fechaCierreInventario) }), _jsx(Descriptions.Item, { label: "Cierre fiscal", children: formatFecha(data?.fechaCierreFiscal) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(SettingOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Configuracion" })] }), style: { marginBottom: 16 }, children: _jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Metodo de facturacion DGII", children: data?.metodoFacturacionDGII || '-' }), _jsx(Descriptions.Item, { label: "ORC en unidades", children: data?.orcEnUnidades ? 'Si' : 'No' })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(ShoppingCartOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "PedidosYa" })] }), extra: _jsx(Button, { type: "primary", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => navigate('/MConfigPedidosYa'), children: "Configurar" }), style: { marginBottom: 16 }, children: loadingPedidosYa ? (_jsx(Spin, {})) : pedidosYaConfig ? (_jsxs(Descriptions, { bordered: true, size: "small", column: isLarge ? 3 : 1, styles: { content: { background: 'transparent' } }, children: [_jsx(Descriptions.Item, { label: "Servidor", children: pedidosYaConfig.servidor }), _jsx(Descriptions.Item, { label: "Puerto", children: pedidosYaConfig.puerto }), _jsx(Descriptions.Item, { label: "Usuario", children: pedidosYaConfig.usuario }), _jsxs(Descriptions.Item, { label: "Margen beneficio", children: [pedidosYaConfig.margenBeneficio, "%"] }), _jsx(Descriptions.Item, { label: "Ruta remota", children: pedidosYaConfig.rutaRemota || '-' }), _jsx(Descriptions.Item, { label: "Prefijo archivo", children: pedidosYaConfig.prefijoArchivo || '-' }), _jsx(Descriptions.Item, { label: "Vendor ID", children: pedidosYaConfig.vendorID || '-' })] })) : (_jsx("div", { className: "paces-text-secondary", style: { padding: '8px 0' }, children: "No hay configuracion de PedidosYa para esta sucursal." })) })] })) }), isLarge && (_jsx(Col, { xs: 24, xxl: 6, style: { padding: 24 }, children: _jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontWeight: 600 }, children: "Informacion" }), children: _jsxs("div", { className: "paces-text-secondary", style: { fontSize: 13, lineHeight: 1.6 }, children: [_jsx("p", { children: "Configure los parametros generales de la empresa." }), _jsx("p", { children: "Los cambios en fechas de cierre afectan el procesamiento contable e inventario." })] }) }) }))] }) })] }));
};
export default Empresa;
