import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Row, Col, Empty, List, Typography, Divider, Spin, message, } from 'antd';
import { CheckCircleOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useCarritoStore } from '../../stores/useCarritoStore';
import { ecommerceApi } from '../../api/ecommerceApi';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';
const { Text, Title } = Typography;
const { TextArea } = Input;
function formatCurrency(value) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2,
    }).format(value);
}
const CheckoutPage = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { items, totalItems, subtotal, impuestos, total, sessionId, cargarCarrito } = useCarritoStore();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const isAuthenticated = useEcommerceAuthStore((s) => s.isAuthenticated);
    const usuario = useEcommerceAuthStore((s) => s.usuario);
    useEffect(() => {
        if (!isAuthenticated) {
            sessionStorage.setItem('ecom_returnUrl', window.location.pathname + window.location.search);
            navigate('/store/login');
            return;
        }
        cargarCarrito().finally(() => setInitialLoading(false));
    }, [isAuthenticated, cargarCarrito, navigate]);
    useEffect(() => {
        if (usuario && isAuthenticated) {
            form.setFieldsValue({
                nombreCliente: usuario.nombre,
                email: usuario.email,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
            });
        }
    }, [usuario, isAuthenticated, form]);
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const orden = await ecommerceApi.crearOrden({
                sessionId,
                nombreCliente: values.nombreCliente,
                email: values.email,
                telefono: values.telefono,
                direccion: values.direccion,
                notas: values.notas || '',
            });
            message.success('¡Orden creada exitosamente!');
            navigate(`/store/orden/${orden.id}`);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al crear la orden');
        }
        finally {
            setLoading(false);
        }
    };
    if (initialLoading) {
        return (_jsx("div", { className: "store-checkout-page", style: { textAlign: 'center', paddingTop: 80 }, children: _jsx(Spin, { size: "large" }) }));
    }
    if (items.length === 0) {
        return (_jsx("div", { className: "store-checkout-page", children: _jsx(Empty, { image: _jsx(ShoppingOutlined, { style: { fontSize: 64, color: '#ccc' } }), description: "Tu carrito est\u00E1 vac\u00EDo", children: _jsx(Button, { type: "primary", onClick: () => navigate('/store'), children: "Ir a la tienda" }) }) }));
    }
    return (_jsxs("div", { className: "store-checkout-page", children: [_jsx(Title, { level: 3, style: { marginBottom: 24 }, children: "Checkout" }), _jsxs(Row, { gutter: [24, 24], children: [_jsx(Col, { xs: 24, lg: 14, children: _jsxs(Card, { className: "store-checkout-resumen", bordered: false, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Resumen del pedido" }), _jsx(List, { dataSource: items, renderItem: (item) => (_jsxs(List.Item, { style: {
                                            padding: '12px 0',
                                            borderBottom: '1px solid var(--paces-border)',
                                        }, children: [_jsx(List.Item.Meta, { title: _jsx(Text, { strong: true, style: { fontSize: 14 }, children: item.nombreProducto }), description: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [item.cantidad, " x ", formatCurrency(item.precioOferta ?? item.precioUnitario)] }) }), _jsx(Text, { strong: true, children: formatCurrency(item.subtotal) })] })) }), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Subtotal" }), _jsx(Text, { children: formatCurrency(subtotal) })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx(Text, { type: "secondary", children: "Impuestos" }), _jsx(Text, { children: formatCurrency(impuestos) })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsxs(Text, { strong: true, style: { fontSize: 16 }, children: ["Total (", totalItems, " ", totalItems === 1 ? 'producto' : 'productos', ")"] }), _jsx(Text, { strong: true, style: { fontSize: 16, color: 'var(--paces-primary)' }, children: formatCurrency(total) })] })] }) }), _jsx(Col, { xs: 24, lg: 10, children: _jsxs(Card, { className: "store-checkout-form", bordered: false, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Datos del cliente" }), _jsxs(Form, { form: form, layout: "vertical", size: "large", onFinish: handleSubmit, autoComplete: "off", children: [_jsx(Form.Item, { label: "Nombre completo", name: "nombreCliente", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Juan P\u00E9rez" }) }), _jsx(Form.Item, { label: "Email", name: "email", rules: [
                                                { required: true, message: 'El email es obligatorio' },
                                                { type: 'email', message: 'Ingresa un email válido' },
                                            ], children: _jsx(Input, { placeholder: "ejemplo@correo.com" }) }), _jsx(Form.Item, { label: "Tel\u00E9fono", name: "telefono", rules: [{ required: true, message: 'El teléfono es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. 809-555-1234" }) }), _jsx(Form.Item, { label: "Direcci\u00F3n de entrega", name: "direccion", rules: [{ required: true, message: 'La dirección es obligatoria' }], children: _jsx(TextArea, { rows: 3, placeholder: "Calle, n\u00FAmero, sector, ciudad..." }) }), _jsx(Form.Item, { label: "Notas adicionales", name: "notas", children: _jsx(TextArea, { rows: 2, placeholder: "Instrucciones especiales, referencias, etc. (opcional)" }) }), _jsx(Form.Item, { style: { marginBottom: 0, marginTop: 8 }, children: _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", icon: _jsx(CheckCircleOutlined, {}), loading: loading, children: "Confirmar Orden" }) })] })] }) })] })] }));
};
export default CheckoutPage;
