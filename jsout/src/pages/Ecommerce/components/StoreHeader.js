import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Badge, Drawer, Button, message, Dropdown, Divider } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, HeartOutlined, SwapOutlined, BellOutlined, UserOutlined, MenuOutlined, CloseOutlined, ShoppingOutlined, EyeOutlined, LoginOutlined, UserAddOutlined, LogoutOutlined, DownOutlined, } from '@ant-design/icons';
import { useCarritoStore } from '../../../stores/useCarritoStore';
import { useFavoritosStore } from '../../../stores/useFavoritosStore';
import { useEcommerceAuthStore } from '../../../stores/ecommerceAuthStore';
import CarritoDrawer from './CarritoDrawer';
import FavoritosDrawer from './FavoritosDrawer';
const StoreHeader = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const buscarActual = searchParams.get('buscar') || '';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [carritoOpen, setCarritoOpen] = useState(false);
    const [favoritosOpen, setFavoritosOpen] = useState(false);
    const totalItems = useCarritoStore((state) => state.totalItems);
    const cargarCarrito = useCarritoStore((state) => state.cargarCarrito);
    const totalFavoritos = useFavoritosStore((state) => state.totalFavoritos);
    const cargarFavoritos = useFavoritosStore((state) => state.cargarFavoritos);
    const isAuthenticated = useEcommerceAuthStore((state) => state.isAuthenticated);
    const usuario = useEcommerceAuthStore((state) => state.usuario);
    const logout = useEcommerceAuthStore((state) => state.logout);
    useEffect(() => {
        cargarCarrito().catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar el carrito');
        });
        cargarFavoritos().catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar favoritos');
        });
    }, [cargarCarrito, cargarFavoritos]);
    const handleSearch = useCallback((value) => {
        if (value.trim()) {
            navigate(`/store?buscar=${encodeURIComponent(value)}`);
        }
        else {
            navigate('/store');
        }
    }, [navigate]);
    const handleLogout = useCallback(() => {
        logout();
        message.info('Sesión cerrada');
        navigate('/store');
    }, [logout, navigate]);
    const menuItems = [
        { label: 'Inicio', href: '/store' },
        { label: 'Categorías', href: '/store#categorias' },
        { label: 'Ofertas', href: '/store?ofertas=true' },
    ];
    const userDropdownItems = {
        items: [
            {
                key: 'perfil',
                label: 'Mi Perfil',
                icon: _jsx(UserOutlined, {}),
                onClick: () => navigate('/store/perfil'),
            },
            {
                key: 'ordenes',
                label: 'Mis Pedidos',
                icon: _jsx(EyeOutlined, {}),
                onClick: () => navigate('/store/ordenes'),
            },
            {
                key: 'logout',
                label: 'Cerrar Sesión',
                icon: _jsx(LogoutOutlined, {}),
                danger: true,
                onClick: handleLogout,
            },
        ],
    };
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "store-header-premium", children: [_jsxs("div", { className: "store-header-logo", onClick: () => navigate('/store'), children: [_jsx("div", { className: "genesis-logo-box", style: { width: 32, height: 32, borderRadius: 8, fontSize: 16 }, children: "G" }), _jsx("span", { children: "Genesis Store" })] }), _jsx("nav", { className: "store-header-nav", children: menuItems.map((item) => (_jsx("a", { href: item.href, className: "store-header-nav-link", onClick: (e) => {
                                e.preventDefault();
                                navigate(item.href);
                            }, children: item.label }, item.label))) }), _jsx("div", { className: "store-header-search-premium", children: _jsx(Input.Search, { placeholder: "Buscar productos...", allowClear: true, defaultValue: buscarActual, onSearch: handleSearch, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }) }), _jsxs("div", { className: "store-header-actions", children: [_jsx("button", { className: "store-header-action-btn", "aria-label": "Favoritos", onClick: () => setFavoritosOpen(true), children: _jsx(Badge, { count: totalFavoritos, size: "small", showZero: false, children: _jsx(HeartOutlined, {}) }) }), _jsx("button", { className: "store-header-action-btn", "aria-label": "Comparar", children: _jsx(SwapOutlined, {}) }), _jsx("button", { className: "store-header-action-btn", "aria-label": "Notificaciones", children: _jsx(Badge, { count: 3, size: "small", children: _jsx(BellOutlined, {}) }) }), _jsx("button", { className: "store-header-action-btn", "aria-label": "Carrito", onClick: () => setCarritoOpen(true), children: _jsx(Badge, { count: totalItems, size: "small", showZero: false, children: _jsx(ShoppingCartOutlined, {}) }) }), isAuthenticated ? (_jsx(Dropdown, { menu: userDropdownItems, placement: "bottomRight", children: _jsxs("button", { className: "store-header-action-btn", "aria-label": "Perfil", style: { width: 'auto', padding: '0 12px', gap: 6, borderRadius: 20 }, children: [_jsx(UserOutlined, {}), _jsx("span", { style: { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }, children: usuario?.nombre?.split(' ')[0] || 'Usuario' }), _jsx(DownOutlined, { style: { fontSize: 10 } })] }) })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "store-header-action-btn", "aria-label": "Iniciar sesi\u00F3n", onClick: () => navigate('/store/login'), title: "Iniciar sesi\u00F3n", children: _jsx(LoginOutlined, {}) }), _jsx(Button, { type: "primary", size: "small", icon: _jsx(UserAddOutlined, {}), onClick: () => navigate('/store/registro'), style: { marginLeft: 4, borderRadius: 20 }, children: "Crear Cuenta" })] }))] }), _jsxs("div", { className: "store-header-mobile", children: [_jsx("button", { className: "store-header-action-btn", "aria-label": "Men\u00FA", onClick: () => setMobileMenuOpen(true), children: _jsx(MenuOutlined, {}) }), _jsx("div", { className: "store-header-logo store-header-mobile-logo", onClick: () => navigate('/store'), children: _jsx(ShoppingOutlined, { style: { fontSize: 24, color: 'var(--paces-primary)' } }) }), _jsx("button", { className: "store-header-action-btn store-header-mobile-cart", "aria-label": "Carrito", onClick: () => setCarritoOpen(true), children: _jsx(Badge, { count: totalItems, size: "small", showZero: false, children: _jsx(ShoppingCartOutlined, {}) }) })] })] }), _jsxs(Drawer, { placement: "left", onClose: () => setMobileMenuOpen(false), open: mobileMenuOpen, width: 280, closable: false, styles: { body: { padding: 0, background: 'var(--paces-bg-container)' } }, children: [_jsxs("div", { style: { padding: 16, borderBottom: '1px solid var(--paces-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { className: "store-header-logo", onClick: () => { navigate('/store'); setMobileMenuOpen(false); }, children: [_jsx("div", { className: "genesis-logo-box", style: { width: 32, height: 32, borderRadius: 8, fontSize: 16 }, children: "G" }), _jsx("span", { children: "Genesis Store" })] }), _jsx(Button, { type: "text", icon: _jsx(CloseOutlined, {}), onClick: () => setMobileMenuOpen(false) })] }), _jsxs("nav", { style: { padding: 8 }, children: [menuItems.map((item) => (_jsx("a", { href: item.href, className: "store-mobile-nav-link", onClick: (e) => {
                                    e.preventDefault();
                                    navigate(item.href);
                                    setMobileMenuOpen(false);
                                }, children: item.label }, item.label))), _jsxs("a", { href: "/store/ordenes", className: "store-mobile-nav-link", onClick: (e) => {
                                    e.preventDefault();
                                    navigate('/store/ordenes');
                                    setMobileMenuOpen(false);
                                }, children: [_jsx(EyeOutlined, { style: { marginRight: 8 } }), "Mis \u00D3rdenes"] }), _jsx(Divider, { style: { margin: '8px 0' } }), isAuthenticated ? (_jsxs(_Fragment, { children: [_jsxs("a", { href: "/store/perfil", className: "store-mobile-nav-link", onClick: (e) => {
                                            e.preventDefault();
                                            navigate('/store/perfil');
                                            setMobileMenuOpen(false);
                                        }, children: [_jsx(UserOutlined, { style: { marginRight: 8 } }), "Mi Perfil"] }), _jsxs("a", { href: "#", className: "store-mobile-nav-link", onClick: (e) => {
                                            e.preventDefault();
                                            handleLogout();
                                            setMobileMenuOpen(false);
                                        }, children: [_jsx(LogoutOutlined, { style: { marginRight: 8 } }), "Cerrar Sesi\u00F3n"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("a", { href: "/store/login", className: "store-mobile-nav-link", onClick: (e) => {
                                            e.preventDefault();
                                            navigate('/store/login');
                                            setMobileMenuOpen(false);
                                        }, children: [_jsx(LoginOutlined, { style: { marginRight: 8 } }), "Iniciar Sesi\u00F3n"] }), _jsxs("a", { href: "/store/registro", className: "store-mobile-nav-link", onClick: (e) => {
                                            e.preventDefault();
                                            navigate('/store/registro');
                                            setMobileMenuOpen(false);
                                        }, children: [_jsx(UserAddOutlined, { style: { marginRight: 8 } }), "Crear Cuenta"] })] }))] })] }), _jsx(CarritoDrawer, { open: carritoOpen, onClose: () => setCarritoOpen(false) }), _jsx(FavoritosDrawer, { open: favoritosOpen, onClose: () => setFavoritosOpen(false) })] }));
};
export default StoreHeader;
