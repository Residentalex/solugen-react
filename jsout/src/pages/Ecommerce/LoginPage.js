import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { ShoppingOutlined, ArrowLeftOutlined, LoginOutlined } from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';
const { Title, Text } = Typography;
const LoginPage = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const login = useEcommerceAuthStore((s) => s.login);
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success('¡Bienvenido de vuelta!');
            const returnUrl = sessionStorage.getItem('ecom_returnUrl');
            sessionStorage.removeItem('ecom_returnUrl');
            navigate(returnUrl || '/store');
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al iniciar sesión';
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "store-auth-page", children: _jsxs("div", { className: "store-auth-container", children: [_jsxs(Card, { className: "store-auth-card", bordered: false, children: [_jsxs("div", { className: "store-auth-logo", onClick: () => navigate('/store'), children: [_jsx("div", { className: "genesis-logo-box", style: { width: 48, height: 48, borderRadius: 12, fontSize: 24 }, children: "G" }), _jsx(Title, { level: 3, style: { margin: 0, color: 'var(--paces-text-heading)' }, children: "Genesis Store" })] }), _jsx(Title, { level: 4, style: { textAlign: 'center', margin: '24px 0 8px' }, children: "Iniciar Sesi\u00F3n" }), _jsx(Text, { type: "secondary", style: { display: 'block', textAlign: 'center', marginBottom: 24 }, children: "Ingresa tus datos para continuar" }), _jsxs(Form, { form: form, layout: "vertical", size: "large", onFinish: handleSubmit, autoComplete: "off", children: [_jsx(Form.Item, { label: "Email", name: "email", rules: [
                                        { required: true, message: 'El email es obligatorio' },
                                        { type: 'email', message: 'Ingresa un email válido' },
                                    ], children: _jsx(Input, { placeholder: "ejemplo@correo.com" }) }), _jsx(Form.Item, { label: "Contrase\u00F1a", name: "password", rules: [{ required: true, message: 'La contraseña es obligatoria' }], children: _jsx(Input.Password, { placeholder: "Tu contrase\u00F1a" }) }), _jsx(Form.Item, { style: { marginBottom: 0, marginTop: 8 }, children: _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", icon: _jsx(LoginOutlined, {}), loading: loading, children: "Iniciar Sesi\u00F3n" }) })] }), _jsx(Divider, { style: { margin: '24px 0' }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "o" }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(Text, { type: "secondary", children: "\u00BFNo tienes cuenta? " }), _jsx(Link, { to: "/store/registro", style: { fontWeight: 600 }, children: "Crear cuenta" })] })] }), _jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx(Button, { type: "link", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/store'), style: { color: 'var(--paces-text-secondary)' }, children: "Volver a la tienda" }) })] }) }));
};
export default LoginPage;
