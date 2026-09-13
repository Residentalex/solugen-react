import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, InputNumber, Button, message, Spin, Space, Row, Col, Switch, } from 'antd';
import { SaveOutlined, ReloadOutlined, ArrowLeftOutlined, ShopOutlined, ContactsOutlined, DollarOutlined, SyncOutlined, } from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
const CAMPOS_CONFIG = [
    { clave: 'NOMBRE_TIENDA', label: 'Nombre de la Tienda', tipo: 'texto', descripcion: 'Nombre que aparece en el header y emails del ecommerce.' },
    { clave: 'PORCENTAJE_MARKUP', label: 'Porcentaje Markup (%)', tipo: 'numero', descripcion: 'Margen de ganancia aplicado sobre el costo para calcular el precio base.' },
    { clave: 'ENVIO_GRATIS_MINIMO', label: 'Envío Gratis Mínimo', tipo: 'numero', descripcion: 'Monto mínimo de compra para aplicar envío gratis. 0 para desactivar.' },
    { clave: 'ITBIS_PORCENTAJE', label: 'ITBIS %', tipo: 'numero', descripcion: 'Porcentaje de impuesto aplicado a las órdenes.' },
    { clave: 'TELEFONO_CONTACTO', label: 'Teléfono de Contacto', tipo: 'texto', descripcion: 'Teléfono mostrado en el footer y página de contacto.' },
    { clave: 'EMAIL_CONTACTO', label: 'Email de Contacto', tipo: 'texto', descripcion: 'Email para notificaciones y soporte al cliente.' },
    { clave: 'MENSAJE_HOME', label: 'Mensaje Home', tipo: 'texto', descripcion: 'Texto promocional mostrado en la página principal del ecommerce.' },
    { clave: 'SOLO_CON_EXISTENCIA', label: 'Solo productos con existencia', tipo: 'switch', descripcion: 'Si está activo, solo se sincronizan productos con stock disponible (> 0).' },
    { clave: 'RUTA_IMAGENES', label: 'Ruta para imágenes', tipo: 'texto', descripcion: 'Ruta absoluta de la carpeta donde se guardarán las imágenes de productos. Ej: D:\\GenesisUploads\\Ecommerce\\' },
];
const EcommerceAdminConfig = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [configMap, setConfigMap] = useState({});
    const navigate = useNavigate();
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const result = await ecommerceApi.adminObtenerConfig();
            const map = {};
            result.forEach((c) => { map[c.clave] = c; });
            setConfigMap(map);
            const valores = {};
            CAMPOS_CONFIG.forEach((campo) => {
                const valor = map[campo.clave]?.valor ?? '';
                if (campo.tipo === 'numero') {
                    valores[campo.clave] = valor ? Number(valor) : 0;
                }
                else if (campo.tipo === 'switch') {
                    valores[campo.clave] = valor === '1' || valor === 1 || valor === true;
                }
                else {
                    valores[campo.clave] = valor;
                }
            });
            form.setFieldsValue(valores);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar configuración');
        }
        finally {
            setLoading(false);
        }
    }, [form]);
    useEffect(() => {
        cargar();
    }, [cargar]);
    const handleGuardar = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            const payload = CAMPOS_CONFIG.map((c) => ({
                clave: c.clave,
                valor: String(c.tipo === 'switch' ? (values[c.clave] ? '1' : '0') : (values[c.clave] ?? '')),
            }));
            const respuesta = await ecommerceApi.adminActualizarConfig(payload);
            message.success(respuesta.mensaje);
            if (respuesta.totalFilasAfectadas === 0) {
                message.warning('Ninguna fila fue actualizada.');
            }
            else {
                const clavesFallidas = respuesta.detalles
                    .filter((d) => d.filasAfectadas === 0)
                    .map((d) => d.clave);
                if (clavesFallidas.length > 0) {
                    message.warning(`Las siguientes claves no se actualizaron: ${clavesFallidas.join(', ')}`);
                }
            }
            message.info(`Total filas afectadas: ${respuesta.totalFilasAfectadas}`);
            cargar();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Spin, { spinning: loading, children: _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, title: "Configuraci\u00F3n del Ecommerce", children: _jsxs(Form, { form: form, layout: "vertical", style: { padding: 24 }, onFinish: handleGuardar, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(ShopOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "General" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "NOMBRE_TIENDA", label: "Nombre de la Tienda", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Nombre que aparece en el header y emails del ecommerce." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "MENSAJE_HOME", label: "Mensaje Home", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Texto promocional mostrado en la p\u00E1gina principal del ecommerce." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(ContactsOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Contacto" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "TELEFONO_CONTACTO", label: "Tel\u00E9fono de Contacto", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Tel\u00E9fono mostrado en el footer y p\u00E1gina de contacto." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "EMAIL_CONTACTO", label: "Email de Contacto", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Email para notificaciones y soporte al cliente." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(DollarOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Financiero" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "PORCENTAJE_MARKUP", label: "Porcentaje Markup (%)", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Margen de ganancia aplicado sobre el costo para calcular el precio base." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "ENVIO_GRATIS_MINIMO", label: "Env\u00EDo Gratis M\u00EDnimo", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Monto m\u00EDnimo de compra para aplicar env\u00EDo gratis. 0 para desactivar." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, precision: 2 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "ITBIS_PORCENTAJE", label: "ITBIS %", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Porcentaje de impuesto aplicado a las \u00F3rdenes." }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, precision: 2 }) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { children: [_jsx(SyncOutlined, { className: "paces-text-icon" }), _jsx("span", { style: { fontWeight: 600 }, children: "Sincronizaci\u00F3n" })] }), style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "SOLO_CON_EXISTENCIA", label: "Solo productos con existencia", valuePropName: "checked", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Si est\u00E1 activo, solo se sincronizan productos con stock disponible (mayor a 0)." }), children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 12, children: _jsx(Form.Item, { name: "RUTA_IMAGENES", label: "Ruta para im\u00E1genes", extra: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Ruta absoluta de la carpeta donde se guardar\u00E1n las im\u00E1genes de productos. Ej: D:\\\\GenesisUploads\\\\Ecommerce\\\\" }), rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }) })] }) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: 24, flexWrap: 'wrap' }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/EDashboard'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar, children: "Restaurar" }), _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), htmlType: "submit", loading: saving, children: "Guardar" })] })] }) }) }));
};
export default EcommerceAdminConfig;
