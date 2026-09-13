import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import GenesisLogo from '../../components/GenesisLogo';
const Login = () => {
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const navigate = useNavigate();
    const loginInProgress = useRef(false);
    useEffect(() => {
        if (isAuthenticated && !loginInProgress.current) {
            const returnUrl = sessionStorage.getItem('returnUrl');
            sessionStorage.removeItem('returnUrl');
            navigate(returnUrl || '/', { replace: true });
        }
    }, [isAuthenticated, navigate]);
    const getEquipo = () => {
        return typeof navigator !== 'undefined'
            ? navigator.userAgentData?.platform || navigator.platform || 'Unknown'
            : 'Unknown';
    };
    const getIP = async () => {
        return '127.0.0.1';
    };
    const handleSubmit = async () => {
        setError('');
        if (!nombreUsuario.trim() || !contrasena.trim()) {
            setError('Los campos de Usuario y Contraseña no pueden estar vacíos.');
            return;
        }
        loginInProgress.current = true;
        setLoading(true);
        try {
            const equipo = getEquipo();
            const ip = await getIP();
            await login({
                nombreUsuario: nombreUsuario.trim().toUpperCase(),
                contrasena,
                equipo,
                ip,
                sucursal: securitySucursal,
            });
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4003/api';
            try {
                const resp = await axios.get(`${apiUrl}/app/version/SoluGen`);
                const version = resp.data?.data;
                if (version) {
                    useAuthStore.getState().setAppVersion(version);
                }
            }
            catch {
                // No bloquear el login si falla obtener la versión
            }
            const usuario = useAuthStore.getState().usuario;
            if (usuario?.debeCambiarClave) {
                navigate('/cambiar-clave', { replace: true });
            }
            else {
                const returnUrl = sessionStorage.getItem('returnUrl');
                sessionStorage.removeItem('returnUrl');
                navigate(returnUrl || '/', { replace: true });
            }
        }
        catch (err) {
            const apiMsg = err.response?.data?.errorMessage || err.response?.data?.ErrorMessage;
            setError(apiMsg || err.message || 'Usuario o contraseña inválida.');
        }
        finally {
            loginInProgress.current = false;
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "paces-login-bg", children: [_jsx("div", { className: "paces-login-brand", children: _jsxs("div", { className: "paces-login-brand-content", children: [_jsx(GenesisLogo, { size: 56, showText: false }), _jsx("h1", { children: "Bienvenido a Genesis" }), _jsx("p", { children: "Sistema de gesti\u00F3n empresarial Solugen ERP" })] }) }), _jsx("div", { className: "paces-login-form", children: _jsxs("div", { className: "paces-login-card", children: [_jsxs("div", { className: "login-header", children: [_jsx("div", { className: "genesis-logo-wrapper", children: _jsx(GenesisLogo, { size: 40, showText: true }) }), _jsx("h2", { children: "Iniciar Sesi\u00F3n" }), _jsx("p", { children: "Ingrese sus credenciales para acceder al sistema" })] }), _jsxs(Form, { layout: "vertical", onFinish: handleSubmit, children: [error && (_jsx(Alert, { message: error, type: "error", showIcon: true, className: "login-alert" })), _jsx(Form.Item, { label: "Usuario", style: { marginBottom: 18 }, children: _jsx(Input, { prefix: _jsx(UserOutlined, {}), value: nombreUsuario, onChange: (e) => setNombreUsuario(e.target.value), placeholder: "Ej: JUAN.PEREZ", autoFocus: true, size: "large" }) }), _jsx(Form.Item, { label: "Contrase\u00F1a", style: { marginBottom: 22 }, children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, {}), value: contrasena, onChange: (e) => setContrasena(e.target.value), placeholder: "Su contrase\u00F1a", size: "large" }) }), _jsx(Form.Item, { style: { marginBottom: 0 }, children: _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, size: "large", block: true, className: "login-submit-btn", style: {
                                            height: 46,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            borderRadius: 10,
                                        }, children: _jsxs("span", { className: "btn-content", children: ["Ingresar ", _jsx(ArrowRightOutlined, {})] }) }) }), _jsx("a", { className: "login-recovery", children: "\u00BFOlvid\u00F3 su contrase\u00F1a?" }), _jsx("div", { className: "login-footer", children: "Genesis ERP \u00B7 \u00A9 2026 Solugen" })] })] }) })] }));
};
export default Login;
