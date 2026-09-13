import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Menu, Avatar, Space, Button, Input, Badge, Typography, Dropdown, } from 'antd';
import { ControlOutlined, AuditOutlined, InboxOutlined, ShopOutlined, FileTextOutlined, ShoppingCartOutlined, TeamOutlined, WalletOutlined, DollarOutlined, BankOutlined, ExperimentOutlined, AppstoreOutlined, DashboardOutlined, UserOutlined, SettingOutlined, LogoutOutlined, PlusOutlined, SearchOutlined, BellOutlined, SunOutlined, } from '@ant-design/icons';
// ─── Iconos por modulo ───────────────────────────────────────────
const ICONOS_MODULOS = {
    Administracion: _jsx(ControlOutlined, {}),
    Contabilidad: _jsx(AuditOutlined, {}),
    Inventario: _jsx(InboxOutlined, {}),
    Ventas: _jsx(ShopOutlined, {}),
    Facturacion: _jsx(FileTextOutlined, {}),
    Compras: _jsx(ShoppingCartOutlined, {}),
    'Recursos Humanos': _jsx(TeamOutlined, {}),
    'Cuentas por Pagar': _jsx(WalletOutlined, {}),
    'Cuentas por Cobrar': _jsx(DollarOutlined, {}),
    Bancos: _jsx(BankOutlined, {}),
    Produccion: _jsx(ExperimentOutlined, {}),
};
const ICONO_DEFAULT = _jsx(AppstoreOutlined, {});
function toTitleCase(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
// ─── SaasMainLayout ──────────────────────────────────────────────
const SaasMainLayout = () => {
    const navigate = useNavigate();
    const usuario = useAuthStore((s) => s.usuario);
    const logout = useAuthStore((s) => s.logout);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const activeModule = useUIStore((s) => s.activeModule);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [openKeys, setOpenKeys] = useState([]);
    const [searchOpen, setSearchOpen] = React.useState(false);
    // ─── Efectos ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);
    useEffect(() => {
        if (isAuthenticated && usuario?.debeCambiarClave) {
            navigate('/cambiar-clave', { replace: true });
        }
    }, [isAuthenticated, usuario?.debeCambiarClave, navigate]);
    // Ctrl+K para busqueda
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    // ─── Construir menu desde pantallas ──────────────────────────
    const menuItems = useMemo(() => {
        const pantallas = usuario?.pantallas || [];
        const items = [
            {
                key: 'dashboard',
                icon: _jsx(DashboardOutlined, {}),
                label: 'Dashboard',
            },
        ];
        if (!pantallas.length)
            return items;
        // Agrupar por modulo
        const modulosMap = new Map();
        for (const p of pantallas) {
            const modulos = p.modulos || [];
            for (const m of modulos) {
                if (!modulosMap.has(m.id)) {
                    modulosMap.set(m.id, { modulo: m, pantallas: [] });
                }
                const entry = modulosMap.get(m.id);
                if (!entry.pantallas.some((x) => x.codigo === p.codigo)) {
                    entry.pantallas.push(p);
                }
            }
        }
        // Ordenar modulos
        const sortedModulos = Array.from(modulosMap.entries())
            .sort(([, a], [, b]) => a.modulo.orden - b.modulo.orden)
            .map(([, entry]) => entry);
        const buildChildren = (modPantallas, moduloNombre) => {
            // Detectar jerarquia
            const parentIdsPresent = new Set(modPantallas.filter((p) => !p.pantallaPadreID).map((p) => p.id));
            const topLevel = modPantallas.filter((p) => !p.pantallaPadreID ||
                (p.pantallaPadreID && !parentIdsPresent.has(p.pantallaPadreID)));
            const childMap = new Map();
            for (const p of modPantallas) {
                if (p.pantallaPadreID && parentIdsPresent.has(p.pantallaPadreID)) {
                    const pid = p.pantallaPadreID;
                    if (!childMap.has(pid))
                        childMap.set(pid, []);
                    childMap.get(pid).push(p);
                }
            }
            for (const [, children] of childMap) {
                children.sort((a, b) => a.orden - b.orden);
            }
            // Agrupar por grupo
            const grupos = new Map();
            const sinGrupo = [];
            for (const p of topLevel) {
                if (p.grupo) {
                    if (!grupos.has(p.grupo))
                        grupos.set(p.grupo, []);
                    grupos.get(p.grupo).push(p);
                }
                else {
                    sinGrupo.push(p);
                }
            }
            for (const [, items] of grupos)
                items.sort((a, b) => a.orden - b.orden);
            sinGrupo.sort((a, b) => a.orden - b.orden);
            const ORDEN_GRUPOS = ['Maestros', 'Operaciones', 'Consultas', 'Reportes'];
            const sortedGrupos = Array.from(grupos.entries()).sort(([aNombre], [bNombre]) => {
                const idxA = ORDEN_GRUPOS.findIndex((g) => g.toLowerCase() === aNombre.toLowerCase());
                const idxB = ORDEN_GRUPOS.findIndex((g) => g.toLowerCase() === bNombre.toLowerCase());
                return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
            });
            const makeKey = (codigo) => `${moduloNombre}__${codigo}`;
            const children = [];
            for (const [grupoNombre, grupoPantallas] of sortedGrupos) {
                if (grupoNombre.toLowerCase() === 'reportes') {
                    // Grupo de reportes → un solo item que lleva a la página consolidada
                    if (grupoPantallas.length > 0) {
                        children.push({
                            key: makeKey(`Reportes_${moduloNombre}`),
                            label: '📊 Reportes',
                        });
                    }
                }
                else {
                    children.push({
                        key: `submenu_${moduloNombre}_${grupoNombre}`,
                        label: grupoNombre,
                        className: grupoPantallas.length > 5 ? 'menu-sub-scroll' : undefined,
                        children: grupoPantallas.map((p) => {
                            const subItems = childMap.get(p.id);
                            if (subItems && subItems.length > 0) {
                                return {
                                    key: makeKey(p.codigo),
                                    label: p.nombre,
                                    children: subItems.map((child) => ({
                                        key: makeKey(child.codigo),
                                        label: child.nombre,
                                    })),
                                };
                            }
                            return { key: makeKey(p.codigo), label: p.nombre };
                        }),
                    });
                }
            }
            for (const p of sinGrupo) {
                const subItems = childMap.get(p.id);
                if (subItems && subItems.length > 0) {
                    children.push({
                        key: makeKey(p.codigo),
                        label: p.nombre,
                        children: subItems.map((child) => ({
                            key: makeKey(child.codigo),
                            label: child.nombre,
                        })),
                    });
                }
                else {
                    children.push({ key: makeKey(p.codigo), label: p.nombre });
                }
            }
            return children;
        };
        const modulosItems = sortedModulos
            .map(({ modulo, pantallas: modPantallas }) => {
            const children = buildChildren(modPantallas, modulo.nombre);
            if (!children || children.length === 0)
                return null;
            return {
                key: modulo.nombre,
                icon: ICONOS_MODULOS[modulo.nombre] || ICONO_DEFAULT,
                label: modulo.nombre,
                children,
            };
        })
            .filter(Boolean);
        items.push(...(modulosItems || []));
        return items;
    }, [usuario?.pantallas]);
    // ─── Handlers ────────────────────────────────────────────────
    const handleMenuClick = ({ key }) => {
        if (key.startsWith('_grupo_') || key.startsWith('submenu_'))
            return;
        const codigo = key.includes('__') ? key.split('__')[1] : key;
        const moduloNombre = key.includes('__') ? key.split('__')[0] : undefined;
        // Reportes consolidados: navegar con ruta amigable
        if (moduloNombre && codigo.startsWith('Reportes_')) {
            setActiveModule(codigo);
            navigate(`/saas/Reportes/${moduloNombre}`);
            return;
        }
        setActiveModule(codigo);
        if (codigo === 'dashboard') {
            navigate('/saas');
        }
        else {
            navigate('/saas/' + codigo);
        }
    };
    const handleOpenChange = (keys) => {
        const topKeys = keys.filter((k) => !k.startsWith('submenu_'));
        const lastTop = topKeys[topKeys.length - 1];
        if (!lastTop) {
            setOpenKeys([]);
            return;
        }
        const related = keys.filter((k) => k === lastTop || k.startsWith('submenu_' + lastTop + '_'));
        setOpenKeys(related);
    };
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    // ─── Selected keys ───────────────────────────────────────────
    const selectedKeys = useMemo(() => {
        if (!activeModule)
            return [];
        const found = menuItems?.find((item) => item?.key === activeModule ||
            item?.key?.endsWith('__' + activeModule) ||
            item?.children?.some((child) => child?.key === activeModule ||
                child?.key?.endsWith('__' + activeModule) ||
                child?.children?.some((sub) => sub?.key === activeModule ||
                    sub?.key?.endsWith('__' + activeModule))));
        return found ? [found.key] : [];
    }, [activeModule, menuItems]);
    // ─── User dropdown ───────────────────────────────────────────
    const userMenuItems = [
        {
            key: 'profile',
            icon: _jsx(UserOutlined, {}),
            label: 'Mi Perfil',
        },
        { type: 'divider' },
        {
            key: 'settings',
            icon: _jsx(SettingOutlined, {}),
            label: 'Configuracion',
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: _jsx(LogoutOutlined, {}),
            label: 'Cerrar Sesion',
            danger: true,
        },
    ];
    const handleUserMenuClick = ({ key }) => {
        if (key === 'profile')
            navigate('/saas/MPerfil');
        if (key === 'settings')
            navigate('/saas/OConfig');
        if (key === 'logout')
            handleLogout();
    };
    if (!isAuthenticated)
        return null;
    const iniciales = usuario?.nombre?.charAt(0)?.toUpperCase() || 'U';
    return (_jsxs("div", { style: {
            display: 'flex',
            height: '100vh',
            background: '#f6f8fa',
            overflow: 'hidden',
        }, children: [_jsxs("div", { style: {
                    width: 240,
                    background: '#fff',
                    borderRight: '1px solid #e8ecf0',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: 200,
                }, children: [_jsx("div", { style: {
                            padding: '20px 24px',
                            borderBottom: '1px solid #e8ecf0',
                        }, children: _jsxs(Space, { children: [_jsx("div", { style: {
                                        width: 32,
                                        height: 32,
                                        background: 'linear-gradient(135deg, #556ee6, #3b4cb8)',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 16,
                                    }, children: "S" }), _jsx("span", { style: { fontWeight: 700, fontSize: 18, color: '#1a1d21' }, children: "Solugen" })] }) }), _jsx("div", { style: {
                            padding: '16px 24px',
                            borderBottom: '1px solid #e8ecf0',
                        }, children: _jsxs(Space, { children: [_jsx(Avatar, { size: 36, style: { backgroundColor: '#556ee6', fontWeight: 600 }, children: iniciales }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13, color: '#1a1d21' }, children: toTitleCase(usuario?.nombre) || 'Usuario' }), _jsx("div", { style: { fontSize: 11, color: '#6b7280' }, children: usuario?.roles?.map((r) => r.nombre).join(', ') || 'Usuario' })] })] }) }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '8px 0' }, children: _jsx(Menu, { mode: "inline", selectedKeys: selectedKeys, openKeys: openKeys, style: {
                                borderRight: 0,
                                fontSize: 13,
                                background: 'transparent',
                                borderInlineEnd: 'none',
                            }, items: menuItems, onClick: handleMenuClick, onOpenChange: handleOpenChange, inlineIndent: 16 }) }), _jsx("div", { style: { padding: '16px 24px', borderTop: '1px solid #e8ecf0' }, children: _jsx(Button, { type: "primary", block: true, shape: "round", icon: _jsx(PlusOutlined, {}), style: { height: 40, fontWeight: 600, borderRadius: 20 }, children: "Nuevo" }) })] }), _jsxs("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    marginLeft: 240,
                    height: '100vh',
                }, children: [_jsxs("div", { style: {
                            height: 64,
                            borderBottom: '1px solid #e8ecf0',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 24px',
                            background: '#fff',
                            flexShrink: 0,
                        }, children: [_jsx(Input.Search, { placeholder: "Buscar en el sistema...", style: { maxWidth: 320 }, prefix: _jsx(SearchOutlined, { style: { color: '#9ca3af' } }), onFocus: (e) => {
                                    e.target.blur();
                                    setSearchOpen(true);
                                }, onSearch: () => setSearchOpen(true) }), _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { size: "middle", children: [_jsx(Badge, { count: 3, size: "small", children: _jsx(Button, { type: "text", icon: _jsx(BellOutlined, { style: { fontSize: 18, color: '#6b7280' } }), shape: "circle" }) }), _jsx(Button, { type: "text", icon: _jsx(SunOutlined, { style: { fontSize: 18, color: '#6b7280' } }), shape: "circle" }), _jsx(Dropdown, { menu: {
                                            items: userMenuItems,
                                            onClick: handleUserMenuClick,
                                        }, placement: "bottomRight", trigger: ['click'], children: _jsx(Avatar, { size: 32, style: {
                                                backgroundColor: '#556ee6',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                            }, children: iniciales }) })] })] }), _jsx("div", { style: {
                            flex: 1,
                            overflow: 'auto',
                            background: '#f6f8fa',
                            padding: 24,
                        }, children: _jsx(Outlet, {}) })] }), searchOpen && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: 120,
                }, onClick: () => setSearchOpen(false), children: _jsxs("div", { style: {
                        background: '#fff',
                        borderRadius: 12,
                        padding: 24,
                        width: 560,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx(Input.Search, { placeholder: "Buscar modulos, documentos...", size: "large", autoFocus: true, style: { width: '100%' }, prefix: _jsx(SearchOutlined, { style: { color: '#9ca3af' } }), onSearch: () => setSearchOpen(false) }), _jsx("div", { style: { marginTop: 16, fontSize: 12, color: '#9ca3af' }, children: "Presiona Esc para cerrar" })] }) }))] }));
};
export default SaasMainLayout;
