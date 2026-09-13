import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Descriptions, Modal, Divider, message, Spin, } from 'antd';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, LockOutlined, ShoppingOutlined, LogoutOutlined, UserOutlined, } from '@ant-design/icons';
import { useEcommerceAuthStore } from '../../stores/ecommerceAuthStore';
const { Title, Text } = Typography;
const { TextArea } = Input;
const PerfilPage = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [formClave] = Form.useForm();
    const usuario = useEcommerceAuthStore((s) => s.usuario);
    const isAuthenticated = useEcommerceAuthStore((s) => s.isAuthenticated);
    const cargarPerfil = useEcommerceAuthStore((s) => s.cargarPerfil);
    const actualizarPerfil = useEcommerceAuthStore((s) => s.actualizarPerfil);
    const cambiarClave = useEcommerceAuthStore((s) => s.cambiarClave);
    const logout = useEcommerceAuthStore((s) => s.logout);
    const [editando, setEditando] = useState(false);
    const [loadingPerfil, setLoadingPerfil] = useState(false);
    const [loadingGuardar, setLoadingGuardar] = useState(false);
    const [modalClaveOpen, setModalClaveOpen] = useState(false);
    const [loadingClave, setLoadingClave] = useState(false);
    // Cargar perfil al montar
    useEffect(() => {
        if (isAuthenticated) {
            setLoadingPerfil(true);
            cargarPerfil().finally(() => setLoadingPerfil(false));
        }
    }, [isAuthenticated, cargarPerfil]);
    // Sincronizar formulario cuando cambia el usuario
    useEffect(() => {
        if (usuario) {
            form.setFieldsValue({
                nombre: usuario.nombre,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
            });
        }
    }, [usuario, form]);
    const handleGuardar = async (values) => {
        setLoadingGuardar(true);
        try {
            await actualizarPerfil(values);
            setEditando(false);
        }
        catch {
            // Error ya manejado en el store
        }
        finally {
            setLoadingGuardar(false);
        }
    };
    const handleCambiarClave = async (values) => {
        if (values.passwordNueva !== values.confirmarPasswordNueva) {
            message.error('Las contraseñas no coinciden');
            return;
        }
        if (values.passwordNueva.length < 6) {
            message.error('La contraseña nueva debe tener al menos 6 caracteres');
            return;
        }
        setLoadingClave(true);
        try {
            await cambiarClave({
                passwordActual: values.passwordActual,
                passwordNueva: values.passwordNueva,
            });
            setModalClaveOpen(false);
            formClave.resetFields();
        }
        catch {
            // Error ya manejado en el store
        }
        finally {
            setLoadingClave(false);
        }
    };
    const handleLogout = () => {
        logout();
        message.info('Sesión cerrada');
        navigate('/store');
    };
    // Proteger ruta: redirigir a login si no está autenticado
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/store/login');
        }
    }, [isAuthenticated, navigate]);
    if (!isAuthenticated) {
        return null;
    }
    if (loadingPerfil) {
        return (_jsx("div", { className: "store-auth-page", children: _jsx("div", { style: { textAlign: 'center', paddingTop: 80 }, children: _jsx(Spin, { size: "large" }) }) }));
    }
    return (_jsxs("div", { className: "store-auth-page", children: [_jsxs("div", { className: "store-perfil-container", children: [_jsx("div", { style: { marginBottom: 24 }, children: _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/store'), children: "Volver a la tienda" }) }), _jsxs(Title, { level: 3, style: { marginBottom: 24 }, children: [_jsx(UserOutlined, { style: { marginRight: 8 } }), "Mi Perfil"] }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, marginBottom: 24 }, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Informaci\u00F3n de la cuenta" }), _jsxs(Descriptions, { bordered: true, size: "small", column: { xs: 1, sm: 2 }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: usuario?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Email", children: usuario?.email || '-' }), _jsx(Descriptions.Item, { label: "Tel\u00E9fono", children: usuario?.telefono || '-' }), _jsx(Descriptions.Item, { label: "Direcci\u00F3n", children: usuario?.direccion || '-' }), _jsx(Descriptions.Item, { label: "Fecha de registro", children: usuario?.fechaRegistro
                                            ? new Date(usuario.fechaRegistro).toLocaleDateString('es-DO')
                                            : '-' })] })] }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, marginBottom: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }, children: [_jsxs(Title, { level: 5, style: { margin: 0 }, children: [_jsx(EditOutlined, { style: { marginRight: 8 } }), "Editar perfil"] }), !editando && (_jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: () => setEditando(true), children: "Editar" }))] }), editando ? (_jsxs(Form, { form: form, layout: "vertical", onFinish: handleGuardar, initialValues: {
                                    nombre: usuario?.nombre,
                                    telefono: usuario?.telefono,
                                    direccion: usuario?.direccion,
                                }, children: [_jsx(Form.Item, { label: "Nombre", name: "nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Tu nombre completo" }) }), _jsx(Form.Item, { label: "Tel\u00E9fono", name: "telefono", rules: [{ required: true, message: 'El teléfono es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. 809-555-1234" }) }), _jsx(Form.Item, { label: "Direcci\u00F3n", name: "direccion", rules: [{ required: true, message: 'La dirección es obligatoria' }], children: _jsx(TextArea, { rows: 3, placeholder: "Calle, n\u00FAmero, sector, ciudad..." }) }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx(Button, { onClick: () => setEditando(false), children: "Cancelar" }), _jsx(Button, { type: "primary", htmlType: "submit", icon: _jsx(SaveOutlined, {}), loading: loadingGuardar, children: "Guardar cambios" })] })] })) : (_jsx(Text, { type: "secondary", children: "Haz clic en Editar para modificar tus datos." }))] }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, marginBottom: 24 }, children: [_jsx(Title, { level: 5, style: { marginBottom: 16 }, children: "Acciones" }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap' }, children: [_jsx(Button, { icon: _jsx(ShoppingOutlined, {}), onClick: () => navigate('/store/ordenes'), children: "Mis Pedidos" }), _jsx(Button, { icon: _jsx(LockOutlined, {}), onClick: () => setModalClaveOpen(true), children: "Cambiar contrase\u00F1a" }), _jsx(Button, { danger: true, icon: _jsx(LogoutOutlined, {}), onClick: handleLogout, children: "Cerrar sesi\u00F3n" })] })] })] }), _jsx(Modal, { title: "Cambiar contrase\u00F1a", open: modalClaveOpen, onCancel: () => {
                    setModalClaveOpen(false);
                    formClave.resetFields();
                }, footer: null, destroyOnHidden: true, children: _jsxs(Form, { form: formClave, layout: "vertical", onFinish: handleCambiarClave, autoComplete: "off", children: [_jsx(Form.Item, { label: "Contrase\u00F1a actual", name: "passwordActual", rules: [{ required: true, message: 'Ingresa tu contraseña actual' }], children: _jsx(Input.Password, { placeholder: "Contrase\u00F1a actual" }) }), _jsx(Form.Item, { label: "Nueva contrase\u00F1a", name: "passwordNueva", rules: [
                                { required: true, message: 'Ingresa la nueva contraseña' },
                                { min: 6, message: 'Mínimo 6 caracteres' },
                            ], children: _jsx(Input.Password, { placeholder: "M\u00EDnimo 6 caracteres" }) }), _jsx(Form.Item, { label: "Confirmar nueva contrase\u00F1a", name: "confirmarPasswordNueva", rules: [
                                { required: true, message: 'Confirma la nueva contraseña' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('passwordNueva') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Las contraseñas no coinciden'));
                                    },
                                }),
                            ], children: _jsx(Input.Password, { placeholder: "Repite la nueva contrase\u00F1a" }) }), _jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsx(Button, { onClick: () => {
                                        setModalClaveOpen(false);
                                        formClave.resetFields();
                                    }, children: "Cancelar" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: loadingClave, children: "Cambiar contrase\u00F1a" })] })] }) })] }));
};
export default PerfilPage;
