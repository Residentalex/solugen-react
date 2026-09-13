import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { Card, Tag, Button, Typography, Row, Col, Space, message, Alert } from 'antd';
import { KeyOutlined, SafetyOutlined, AppstoreOutlined, CalendarOutlined, UserOutlined, CheckCircleOutlined, TeamOutlined, IdcardOutlined, ReloadOutlined, BankOutlined, RightCircleOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { authApi } from '../../api/authApi';
import EntidadImagen from '../../components/EntidadImagen';
const { Text, Title } = Typography;
const MiPerfil = () => {
    const usuario = useAuthStore((s) => s.usuario);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);
    const refreshToken = useAuthStore((s) => s.refreshToken);
    const equipo = useAuthStore((s) => s.equipo);
    const ip = useAuthStore((s) => s.ip);
    const compania = useAuthStore((s) => s.compania);
    useEffect(() => {
        setActiveModule('MPerfil');
        return () => resetToolbar();
    }, [setActiveModule, resetToolbar]);
    const [recargando, setRecargando] = React.useState(false);
    const [loadingError, setLoadingError] = React.useState(false);
    const handleRefresh = () => {
        setLoadingError(false);
        handleRecargarPermisos();
    };
    const handleRecargarPermisos = async () => {
        setRecargando(true);
        try {
            const sesion = await authApi.refresh({ refreshToken, equipo, ip, sucursal: compania });
            setSession({
                accessToken: sesion.accessToken,
                refreshToken: sesion.refreshToken,
                usuario: sesion.usuario,
                sucursalActiva: sesion.sucursalActiva,
                sucursalContable: sesion.sucursalContable,
                sucursalesPermitidas: sesion.sucursalesPermitidas,
            });
            message.success('Permisos recargados correctamente');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al recargar permisos');
            setLoadingError(true);
        }
        finally {
            setRecargando(false);
        }
    };
    if (!usuario)
        return null;
    const inicial = usuario.nombre?.charAt(0)?.toUpperCase() || 'U';
    const pantallasUnicas = new Set(usuario.pantallas?.map((p) => p.codigo)).size;
    const vigenciaBaja = usuario.diasVigencia > 0 && usuario.diasVigencia <= 15;
    const sucursalActivaNombre = usuario.sucursalesRoles?.find((sr) => sr.sucursal === sucursalActiva)?.nombreSucursal
        || sucursalesPermitidas?.find((sp) => sp.sucursal === sucursalActiva)?.nombre
        || '—';
    const infoItems = [
        { label: 'Nombre', value: usuario.nombre || '-', icon: _jsx(IdcardOutlined, {}) },
        { label: 'Usuario', value: usuario.nombreUsuario, icon: _jsx(UserOutlined, {}) },
        { label: 'Empleado', value: usuario.empleado || '-', icon: _jsx(TeamOutlined, {}) },
        { label: 'ID Empleado', value: usuario.empleadoID || '-', icon: _jsx(IdcardOutlined, {}) },
        { label: 'Sucursal activa', value: sucursalActivaNombre, icon: _jsx(BankOutlined, {}) },
        {
            label: 'Vigencia de clave',
            value: usuario.diasVigencia > 0 ? `${usuario.diasVigencia} días` : 'Ilimitada',
            icon: _jsx(CalendarOutlined, {}),
        },
        {
            label: 'Estado',
            value: usuario.activo ? 'Activo' : 'Inactivo',
            icon: _jsx(CheckCircleOutlined, {}),
            valueNode: (_jsx(Tag, { color: usuario.activo ? 'green' : 'red', style: { borderRadius: 6, margin: 0 }, children: usuario.activo ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar perfil", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 10, marginBottom: 24 }, children: _jsxs("div", { style: { padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18 }, children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: usuario?.id ?? 0, fallback: inicial, size: 46, style: { borderRadius: 10 } }), _jsxs("div", { style: { flex: 1, lineHeight: 1.4 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 16, color: 'var(--paces-text-heading)' }, children: usuario.nombre || 'Sin nombre' }), _jsxs("div", { style: { color: 'var(--paces-text-secondary)', fontSize: 13 }, children: ["@", usuario.nombreUsuario, " \u00B7 ", _jsx(Tag, { color: usuario.activo ? 'green' : 'red', style: { borderRadius: 5, padding: '0 7px', margin: 0, fontSize: 11, lineHeight: '20px' }, children: usuario.activo ? 'Activo' : 'Inactivo' })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexShrink: 0 }, children: [_jsx(Button, { size: "small", icon: _jsx(ReloadOutlined, {}), loading: recargando, onClick: handleRecargarPermisos, style: { borderRadius: 6 } }), _jsx(Button, { size: "small", type: "primary", icon: _jsx(KeyOutlined, {}), onClick: () => navigate('/cambiar-clave'), style: { borderRadius: 6 } })] })] }) }), _jsxs(Row, { gutter: [24, 24], style: { marginBottom: 24 }, children: [_jsx(Col, { xs: 24, sm: 8, children: _jsx("div", { className: "paces-stat-card paces-stat-card--primary", children: _jsxs("div", { className: "paces-stat-card-body", children: [_jsx("div", { className: "paces-stat-icon", style: { background: 'rgba(85,110,230,0.12)' }, children: _jsx(SafetyOutlined, { style: { color: 'var(--paces-primary)', fontSize: 24 } }) }), _jsxs("div", { className: "paces-stat-card-content", children: [_jsx("div", { className: "paces-stat-value", children: usuario.roles?.length || 0 }), _jsx("div", { className: "paces-stat-label", children: "Roles" })] })] }) }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsx("div", { className: "paces-stat-card paces-stat-card--success", children: _jsxs("div", { className: "paces-stat-card-body", children: [_jsx("div", { className: "paces-stat-icon", style: { background: 'rgba(52,195,143,0.12)' }, children: _jsx(AppstoreOutlined, { style: { color: '#34c38f', fontSize: 24 } }) }), _jsxs("div", { className: "paces-stat-card-content", children: [_jsx("div", { className: "paces-stat-value", children: pantallasUnicas }), _jsx("div", { className: "paces-stat-label", children: "Pantallas" })] })] }) }) }), _jsx(Col, { xs: 24, sm: 8, children: _jsx("div", { className: `paces-stat-card ${vigenciaBaja ? 'paces-stat-card--warning' : 'paces-stat-card--success'}`, children: _jsxs("div", { className: "paces-stat-card-body", children: [_jsx("div", { className: "paces-stat-icon", style: {
                                            background: vigenciaBaja ? 'rgba(240,179,69,0.12)' : 'rgba(52,195,143,0.12)',
                                        }, children: _jsx(CalendarOutlined, { style: {
                                                color: vigenciaBaja ? '#f0b345' : '#34c38f',
                                                fontSize: 24,
                                            } }) }), _jsxs("div", { className: "paces-stat-card-content", children: [_jsx("div", { className: "paces-stat-value", children: usuario.diasVigencia > 0 ? `${usuario.diasVigencia}d` : '∞' }), _jsx("div", { className: "paces-stat-label", children: "Vigencia de clave" })] })] }) }) })] }), _jsxs(Row, { gutter: [24, 24], children: [_jsx(Col, { xs: 24, lg: 14, children: _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 12, height: '100%' }, styles: { body: { padding: 0 } }, children: _jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs(Title, { level: 5, style: {
                                            marginBottom: 0,
                                            color: 'var(--paces-text-heading)',
                                            paddingBottom: 14,
                                            borderBottom: '1px solid var(--paces-border)',
                                        }, children: [_jsx(UserOutlined, { style: { color: 'var(--paces-primary)', marginRight: 8 } }), "Informaci\u00F3n General"] }), _jsx("div", { children: infoItems.map((item, idx) => (_jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '11px 0',
                                                borderBottom: idx < infoItems.length - 1
                                                    ? '1px solid var(--paces-border-secondary)'
                                                    : 'none',
                                            }, children: [_jsxs(Space, { size: 6, children: [_jsx("span", { style: { color: 'var(--paces-text-secondary)', fontSize: 13 }, children: item.icon }), _jsx("span", { style: { color: 'var(--paces-text-secondary)', fontSize: 13 }, children: item.label })] }), item.valueNode || (_jsx("span", { style: {
                                                        color: 'var(--paces-text)',
                                                        fontWeight: 500,
                                                        fontSize: 13,
                                                        textAlign: 'right',
                                                    }, children: item.value }))] }, idx))) })] }) }) }), _jsx(Col, { xs: 24, lg: 10, children: _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 12, height: '100%' }, styles: { body: { padding: 0 } }, children: _jsxs("div", { style: { padding: '20px 24px' }, children: [_jsxs(Title, { level: 5, style: {
                                            marginBottom: 16,
                                            color: 'var(--paces-text-heading)',
                                        }, children: [_jsx(SafetyOutlined, { style: { color: 'var(--paces-primary)', marginRight: 8 } }), "Roles y Sucursales"] }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx(Text, { strong: true, style: {
                                                    fontSize: 12,
                                                    color: 'var(--paces-text-secondary)',
                                                    display: 'block',
                                                    marginBottom: 8,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                }, children: "Roles asignados" }), usuario.roles && usuario.roles.length > 0 ? (_jsx(Space, { wrap: true, size: [6, 6], children: usuario.roles.map((r) => (_jsx(Tag, { color: "blue", style: { borderRadius: 8, padding: '2px 10px', margin: 0 }, children: r.nombre }, r.id))) })) : (_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Sin roles asignados" }))] }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: {
                                                    fontSize: 12,
                                                    color: 'var(--paces-text-secondary)',
                                                    display: 'block',
                                                    marginBottom: 8,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                }, children: "Sucursales" }), usuario.sucursalesRoles && usuario.sucursalesRoles.length > 0 ? (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: usuario.sucursalesRoles.map((sr) => {
                                                    const esActiva = sr.sucursal === sucursalActiva;
                                                    return (_jsxs("div", { style: {
                                                            padding: '10px 12px',
                                                            borderRadius: 8,
                                                            background: esActiva
                                                                ? 'var(--paces-selected-bg)'
                                                                : 'var(--paces-topbar-search-bg)',
                                                            border: esActiva
                                                                ? '1px solid var(--paces-primary)'
                                                                : '1px solid transparent',
                                                            transition: 'all 0.15s',
                                                        }, children: [_jsxs("div", { style: {
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    marginBottom: 4,
                                                                }, children: [_jsxs(Space, { size: 6, children: [_jsx(BankOutlined, { style: {
                                                                                    color: esActiva
                                                                                        ? 'var(--paces-primary)'
                                                                                        : 'var(--paces-text-secondary)',
                                                                                    fontSize: 13,
                                                                                } }), _jsx(Text, { strong: true, style: {
                                                                                    fontSize: 13,
                                                                                    color: esActiva
                                                                                        ? 'var(--paces-primary)'
                                                                                        : 'var(--paces-text)',
                                                                                }, children: sr.nombreSucursal })] }), esActiva && (_jsx(Tag, { color: "blue", style: {
                                                                            borderRadius: 6,
                                                                            fontSize: 10,
                                                                            lineHeight: '16px',
                                                                            padding: '0 6px',
                                                                            margin: 0,
                                                                        }, icon: _jsx(RightCircleOutlined, {}), children: "Activa" }))] }), _jsx(Space, { size: [4, 4], wrap: true, children: sr.roles.map((r) => (_jsx(Tag, { style: {
                                                                        borderRadius: 6,
                                                                        fontSize: 11,
                                                                        lineHeight: '18px',
                                                                        margin: 0,
                                                                        background: esActiva
                                                                            ? 'rgba(85,110,230,0.08)'
                                                                            : 'var(--paces-hover-bg)',
                                                                        border: 'none',
                                                                        color: esActiva
                                                                            ? 'var(--paces-primary)'
                                                                            : 'var(--paces-text-secondary)',
                                                                    }, children: r.nombre }, r.id))) })] }, sr.sucursal));
                                                }) })) : (_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "Sin sucursales asignadas" }))] })] }) }) })] })] }));
};
export default MiPerfil;
