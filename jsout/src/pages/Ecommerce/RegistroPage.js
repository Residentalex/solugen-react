import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { ArrowLeftOutlined, UserAddOutlined } from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';
const { Title, Text } = Typography;
const { TextArea } = Input;
const RegistroPage = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const registro = useEcommerceAuthStore((s) => s.registro);
    const handleSubmit = async (values) => {
        if (values.password !== values.confirmarPassword) {
            message.error('Las contraseñas no coinciden');
            return;
        }
        if (values.password.length < 6) {
            message.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await registro({
                nombre: values.nombre,
                email: values.email,
                password: values.password,
                telefono: values.telefono,
                direccion: values.direccion,
            });
            message.success('¡Cuenta creada exitosamente!');
            navigate('/store');
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al crear la cuenta';
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "store-auth-page", children: _jsxs("div", { className: "store-auth-container", children: [_jsxs(Card, { className: "store-auth-card", bordered: false, children: [_jsxs("div", { className: "store-auth-logo", onClick: () => navigate('/store'), children: [_jsx("div", { className: "genesis-logo-box", style: { width: 48, height: 48, borderRadius: 12, fontSize: 24 }, children: "G" }), _jsx(Title, { level: 3, style: { margin: 0, color: 'var(--paces-text-heading)' }, children: "Genesis Store" })] }), _jsx(Title, { level: 4, style: { textAlign: 'center', margin: '24px 0 8px' }, children: "Crear Cuenta" }), _jsx(Text, { type: "secondary", style: { display: 'block', textAlign: 'center', marginBottom: 24 }, children: "Reg\u00EDstrate para comprar m\u00E1s r\u00E1pido" }), _jsxs(Form, { form: form, layout: "vertical", size: "large", onFinish: handleSubmit, autoComplete: "off", children: [_jsx(Form.Item, { label: "Nombre completo", name: "nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Juan P\u00E9rez" }) }), _jsx(Form.Item, { label: "Email", name: "email", rules: [
                                        { required: true, message: 'El email es obligatorio' },
                                        { type: 'email', message: 'Ingresa un email válido' },
                                    ], children: _jsx(Input, { placeholder: "ejemplo@correo.com" }) }), _jsx(Form.Item, { label: "Contrase\u00F1a", name: "password", rules: [
                                        { required: true, message: 'La contraseña es obligatoria' },
                                        { min: 6, message: 'Mínimo 6 caracteres' },
                                    ], children: _jsx(Input.Password, { placeholder: "M\u00EDnimo 6 caracteres" }) }), _jsx(Form.Item, { label: "Confirmar contrase\u00F1a", name: "confirmarPassword", rules: [
                                        { required: true, message: 'Confirma tu contraseña' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Las contraseñas no coinciden'));
                                            },
                                        }),
                                    ], children: _jsx(Input.Password, { placeholder: "Repite tu contrase\u00F1a" }) }), _jsx(Form.Item, { label: "Tel\u00E9fono", name: "telefono", rules: [{ required: true, message: 'El teléfono es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. 809-555-1234" }) }), _jsx(Form.Item, { label: "Direcci\u00F3n", name: "direccion", rules: [{ required: true, message: 'La dirección es obligatoria' }], children: _jsx(TextArea, { rows: 2, placeholder: "Calle, n\u00FAmero, sector, ciudad..." }) }), _jsx(Form.Item, { style: { marginBottom: 0, marginTop: 8 }, children: _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", icon: _jsx(UserAddOutlined, {}), loading: loading, children: "Crear Cuenta" }) })] }), _jsx(Divider, { style: { margin: '24px 0' }, children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "o" }) }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(Text, { type: "secondary", children: "\u00BFYa tienes cuenta? " }), _jsx(Link, { to: "/store/login", style: { fontWeight: 600 }, children: "Iniciar sesi\u00F3n" })] })] }), _jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx(Button, { type: "link", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/store'), style: { color: 'var(--paces-text-secondary)' }, children: "Volver a la tienda" }) })] }) }));
};
export default RegistroPage;
