import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Button, Spin, message, Empty, Grid, Tooltip, Avatar, Alert, Modal, Descriptions, Typography, Input, Space } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
const { Text } = Typography;
const Roles = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const screens = Grid.useBreakpoint();
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [searchText, setSearchText] = useState('');
    const cargarRoles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rolApi.obtenerListado(securitySucursal);
            setRoles(data || []);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [securitySucursal]);
    useEffect(() => {
        setActiveModule('MROL');
        updateToolbar({});
        cargarRoles();
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar, cargarRoles]);
    const abrirDetalle = async (rol) => {
        setDetalleItem(rol);
        setDetalleVisible(true);
        setCargandoDetalle(true);
        try {
            const completo = await rolApi.obtenerPorId(securitySucursal, rol.id);
            setDetalleItem(completo);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle del rol');
        }
        finally {
            setCargandoDetalle(false);
        }
    };
    const handleRefresh = useCallback(() => {
        setLoadingError(false);
        cargarRoles();
    }, [cargarRoles]);
    const isSmall = !screens.md;
    const cardSpan = isSmall ? 24 : screens.xl ? 8 : screens.lg ? 12 : 12;
    const rolesFiltrados = searchText
        ? roles.filter((r) => {
            const q = searchText.toLowerCase();
            return ((r.nombre || '').toLowerCase().includes(q) ||
                (r.descripcion || '').toLowerCase().includes(q));
        })
        : roles;
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(Alert, { message: "Error al cargar roles", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: "Administrar Roles" }), _jsxs(Space, { children: [_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => navigate('/MROL/nuevo'), children: "Nuevo Rol" }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] })] }), _jsx("div", { style: { marginBottom: 16 }, children: _jsx(Input.Search, { placeholder: "Buscar roles...", allowClear: true, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }), onSearch: (value) => setSearchText(value), onKeyDown: (e) => {
                        if (e.key === 'Escape') {
                            e.target.blur();
                            setSearchText('');
                        }
                    } }) }), _jsx(Spin, { spinning: loading, children: rolesFiltrados.length === 0 && !loading ? (_jsx(Empty, { description: searchText ? 'No hay roles que coincidan con la búsqueda' : 'No hay roles registrados' })) : (_jsx(Row, { gutter: [16, 16], children: rolesFiltrados.map((rol) => (_jsx(Col, { span: cardSpan, children: _jsxs(Card, { hoverable: true, style: { borderRadius: 8, height: '100%', position: 'relative' }, styles: { body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 600, marginBottom: 4 }, children: rol.nombre }), _jsx("div", { className: "paces-text-muted", style: { fontSize: 13, lineHeight: 1.4, marginBottom: 8 }, children: rol.descripcion || 'Sin descripción' })] }), _jsx(Tag, { color: rol.activo ? 'green' : 'default', style: { marginLeft: 8, flexShrink: 0 }, children: rol.activo ? 'Activo' : 'Inactivo' })] }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, minHeight: 28 }, children: (() => {
                                        const users = rol.nombresUsuarios || [];
                                        if (users.length === 0) {
                                            return (_jsx("span", { className: "paces-text-muted", style: { fontSize: 13 }, children: "Sin usuarios" }));
                                        }
                                        const maxShow = 3;
                                        return (_jsx(Avatar.Group, { max: { count: maxShow, style: { backgroundColor: '#f0f0f0', color: '#595959', fontSize: 11, fontWeight: 600 } }, children: users.map((nombre, i) => {
                                                const inicial = nombre.trim().charAt(0).toUpperCase();
                                                const colores = ['#556ee6', '#f46a6a', '#34c38f', '#f1b44c', '#50a5f1', '#f46a6a', '#e060a0', '#7c6bcb'];
                                                return (_jsx(Avatar, { style: { backgroundColor: colores[i % colores.length], verticalAlign: 'middle', fontSize: 11 }, size: 24, children: inicial }, `${rol.id}-${i}`));
                                            }) }));
                                    })() }), _jsxs("div", { style: { flex: 1, marginBottom: 16 }, children: [_jsx("div", { className: "paces-text-muted", style: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }, children: "Permisos" }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, children: [(rol.pantallas || []).slice(0, 5).map((pp) => (_jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: pp.nombre }, pp.id))), (rol.pantallas || []).length > 5 && (_jsxs(Tag, { style: { fontSize: 11 }, children: ["+", rol.pantallas.length - 5, " m\u00E1s"] }))] })] }), _jsxs("div", { className: "paces-border-top", style: { display: 'flex', gap: 8, paddingTop: 12, marginTop: 'auto' }, children: [_jsx(Tooltip, { title: "Ver detalle", children: _jsx(Button, { type: "link", size: "small", icon: _jsx(EyeOutlined, {}), onClick: () => abrirDetalle(rol), children: "Ver detalle" }) }), _jsx(Tooltip, { title: "Editar rol", children: _jsx(Button, { type: "link", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => navigate(`/MROL/${rol.id}/editar`), children: "Editar" }) })] })] }) }, rol.id))) })) }), _jsx(Modal, { title: `Detalle del Rol: ${detalleItem?.nombre || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 640, children: _jsx(Spin, { spinning: cargandoDetalle, children: detalleItem && (_jsxs(_Fragment, { children: [_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "Nombre", children: detalleItem.nombre }), _jsx(Descriptions.Item, { label: "Descripci\u00F3n", children: detalleItem.descripcion || '-' }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(Tag, { color: detalleItem.activo ? 'green' : 'default', children: detalleItem.activo ? 'Activo' : 'Inactivo' }) }), _jsx(Descriptions.Item, { label: "Usuarios", children: detalleItem.cantidadUsuarios != null ? detalleItem.cantidadUsuarios : (detalleItem.nombresUsuarios?.length || 0) })] }), _jsxs("div", { style: { marginTop: 24 }, children: [_jsxs("h5", { style: { marginBottom: 12, fontWeight: 600 }, children: ["Pantallas y Permisos (", detalleItem.pantallas?.length || 0, ")"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: (detalleItem.pantallas || []).map((pp) => (_jsxs(Card, { size: "small", className: "paces-card", style: { borderRadius: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { strong: true, children: pp.nombre }), _jsx("div", { style: { display: 'flex', gap: 4 }, children: pp.acciones.map((acc) => (_jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: acc }, acc))) })] }), pp.permisosEspeciales && pp.permisosEspeciales.length > 0 && (_jsx("div", { style: { display: 'flex', gap: 4, marginTop: 8, marginLeft: 8 }, children: pp.permisosEspeciales.map((pe) => (_jsx(Tag, { color: "green", style: { fontSize: 10 }, children: pe }, pe))) }))] }, pp.id))) })] }), detalleItem.nombresUsuarios && detalleItem.nombresUsuarios.length > 0 && (_jsxs("div", { style: { marginTop: 16 }, children: [_jsx("h5", { style: { marginBottom: 8, fontWeight: 600 }, children: "Usuarios Asignados" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, children: detalleItem.nombresUsuarios.map((nombre, i) => (_jsx(Tag, { color: "geekblue", children: nombre }, i))) })] }))] })) }) })] }));
};
export default Roles;
