import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { BankOutlined, ShoppingCartOutlined, DashboardOutlined, AppstoreOutlined, ControlOutlined, AuditOutlined, ShopOutlined, FileTextOutlined, ExperimentOutlined, InboxOutlined, TeamOutlined, WalletOutlined, DollarOutlined, } from '@ant-design/icons';
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
const Sidebar = () => {
    const usuario = useAuthStore((s) => s.usuario);
    const activeModule = useUIStore((s) => s.activeModule);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const [openKeys, setOpenKeys] = React.useState([]);
    const navigate = useNavigate();
    const menuItems = React.useMemo(() => {
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
        const modulosMap = new Map();
        for (const p of pantallas) {
            const modulos = p.modulos || [];
            if (modulos.length > 0) {
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
        }
        const buildChildren = (modPantallas, moduloNombre) => {
            const parentIdsPresent = new Set(modPantallas.filter((p) => !p.pantallaPadreID).map((p) => p.id));
            const topLevel = modPantallas.filter((p) => !p.pantallaPadreID || (p.pantallaPadreID && !parentIdsPresent.has(p.pantallaPadreID)));
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
            for (const [, items] of grupos) {
                items.sort((a, b) => a.orden - b.orden);
            }
            sinGrupo.sort((a, b) => a.orden - b.orden);
            const children = [];
            const ORDEN_GRUPOS = ['Maestros', 'Operaciones', 'Consultas', 'Reportes'];
            const sortedGrupos = Array.from(grupos.entries()).sort(([aNombre], [bNombre]) => {
                const idxA = ORDEN_GRUPOS.findIndex(g => g.toLowerCase() === aNombre.toLowerCase());
                const idxB = ORDEN_GRUPOS.findIndex(g => g.toLowerCase() === bNombre.toLowerCase());
                const prioA = idxA >= 0 ? idxA : 999;
                const prioB = idxB >= 0 ? idxB : 999;
                return prioA - prioB;
            });
            const makeKey = (codigo) => `${moduloNombre}__${codigo}`;
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
                        label: _jsx("span", { className: "menu-group-label", children: grupoNombre }),
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
        const sortedModulos = Array.from(modulosMap.entries())
            .sort(([, a], [, b]) => a.modulo.orden - b.modulo.orden)
            .map(([, entry]) => entry);
        const modulosItems = sortedModulos
            .map(({ modulo, pantallas: modPantallas }) => {
            const children = buildChildren(modPantallas, modulo.nombre);
            if (!children || children.length === 0)
                return null;
            return {
                key: modulo.nombre,
                icon: ICONOS_MODULOS[modulo.nombre] || ICONO_DEFAULT,
                label: _jsx("span", { className: "menu-module-label", children: modulo.nombre }),
                children,
            };
        })
            .filter(Boolean);
        items.push(...(modulosItems || []));
        return items;
    }, [usuario?.pantallas]);
    const handleMenuClick = ({ key }) => {
        if (key.startsWith('_grupo_') || key.startsWith('submenu_'))
            return;
        const codigo = key.includes('__') ? key.split('__')[1] : key;
        const moduloNombre = key.includes('__') ? key.split('__')[0] : undefined;
        // Reportes consolidados: navegar con ruta amigable
        if (moduloNombre && codigo.startsWith('Reportes_')) {
            setActiveModule(codigo);
            navigate(`/Reportes/${moduloNombre}`);
            return;
        }
        setActiveModule(codigo);
        if (codigo === 'dashboard') {
            navigate('/');
        }
        else {
            let moduloID;
            if (moduloNombre) {
                const pantalla = usuario?.pantallas?.find((p) => p.codigo === codigo);
                const modulo = pantalla?.modulos?.find((m) => m.nombre === moduloNombre);
                moduloID = modulo?.id;
            }
            const params = moduloID ? `?modulo=${moduloID}` : '';
            navigate(`/${codigo}${params}`);
        }
    };
    const handleOpenChange = (keys) => {
        const topKeys = keys.filter(k => !k.startsWith('submenu_'));
        const lastTop = topKeys[topKeys.length - 1];
        if (!lastTop) {
            setOpenKeys([]);
            return;
        }
        const related = keys.filter(k => k === lastTop || k.startsWith(`submenu_${lastTop}_`));
        setOpenKeys(related);
    };
    return (_jsx(Menu, { mode: "inline", theme: "dark", selectedKeys: activeModule
            ? (() => {
                const found = menuItems?.find((item) => item?.key === activeModule ||
                    item?.key?.endsWith(`__${activeModule}`) ||
                    item?.children?.some((child) => child?.key === activeModule ||
                        child?.key?.endsWith(`__${activeModule}`) ||
                        child?.children?.some((sub) => sub?.key === activeModule ||
                            sub?.key?.endsWith(`__${activeModule}`))));
                return found ? [found.key] : [];
            })()
            : [], openKeys: openKeys, defaultOpenKeys: [], style: { borderRight: 0, fontSize: 13, background: 'transparent' }, items: menuItems, onClick: handleMenuClick, onOpenChange: handleOpenChange, inlineIndent: sidebarCollapsed ? 8 : 16, className: "sidebar-menu" }));
};
export default Sidebar;
