import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Layout, Typography, Button, Card, Space, Select, Tag } from 'antd';
import GenesisLogo from '../../components/GenesisLogo';
const { Header, Content } = Layout;
const { Title, Text } = Typography;
const SUCURSALES = [
    { value: 1, label: 'Compra' },
    { value: 2, label: 'Orense Plaza' },
    { value: 3, label: 'Hiper Romana' },
    { value: 4, label: 'Orense Villa Hermosa' },
    { value: 5, label: 'El Ofertazo' },
];
const Home = () => {
    const usuario = useAuthStore((s) => s.usuario);
    const logout = useAuthStore((s) => s.logout);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };
    const handleSucursalChange = (value) => {
        setSucursalActiva(value);
    };
    return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsx(Header, { className: "paces-home-header", style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }, children: _jsx(GenesisLogo, {}) }), _jsx(Content, { style: { padding: 24, display: 'flex', justifyContent: 'center' }, children: _jsxs(Card, { style: { width: 500, marginTop: 50 }, children: [_jsxs(Title, { level: 3, children: ["Bienvenido, ", usuario?.nombre || 'Usuario'] }), _jsxs(Space, { direction: "vertical", style: { width: '100%' }, children: [_jsxs(Text, { children: [_jsx("strong", { children: "Nombre:" }), " ", usuario?.nombre || usuario?.nombreUsuario] }), _jsx("div", { children: _jsxs(Text, { children: [_jsx("strong", { children: "Compa\u00F1\u00EDa:" }), " ", _jsx(Tag, { color: "blue", children: "Consolidado" })] }) }), _jsxs("div", { children: [_jsx(Text, { children: _jsx("strong", { children: "Sucursal Activa:" }) }), _jsx(Select, { value: sucursalActiva, onChange: handleSucursalChange, options: SUCURSALES, style: { width: 200, marginLeft: 8 } })] }), _jsx(Button, { type: "primary", danger: true, onClick: handleLogout, style: { marginTop: 16 }, children: "Cerrar Sesi\u00F3n" })] })] }) })] }));
};
export default Home;
