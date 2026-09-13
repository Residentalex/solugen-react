import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { authApi } from '../../api/authApi';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, message, Modal, Alert, Tabs, Typography, Table } from 'antd';
import { ArrowLeftOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import { rolApi } from '../../api/rolApi';
import { ErrorDetalle } from '../../components';
import EntidadImagen from '../../components/EntidadImagen';
/* ───────── helpers ───────── */
function formatFecha(iso) {
    if (!iso)
        return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function letraInicial(nombre) {
    return (nombre || '?').charAt(0).toUpperCase();
}
/* ───────── subcomponentes ───────── */
const EstadoTag = ({ activo }) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' }));
const CambiarClaveTag = ({ debe }) => (_jsx(Tag, { color: debe ? 'orange' : 'green', children: debe ? 'Pendiente' : 'Completado' }));
/* ───────── renderizado de pantallas como tabla ───────── */
function renderPantallasGrouped(pantallas) {
    const data = [...pantallas].sort((a, b) => {
        const modA = a.modulos?.[0]?.orden ?? 999;
        const modB = b.modulos?.[0]?.orden ?? 999;
        if (modA !== modB)
            return modA - modB;
        return a.orden - b.orden;
    });
    return (_jsx(Table, { dataSource: data, rowKey: "id", size: "small", pagination: false, columns: [
            {
                title: 'Código',
                dataIndex: 'codigo',
                width: 100,
                render: (text) => (_jsx("span", { style: { fontFamily: 'monospace', fontWeight: 600, color: '#556ee6', fontSize: 12 }, children: text })),
            },
            {
                title: 'Nombre',
                dataIndex: 'nombre',
                render: (text) => _jsx("span", { style: { fontSize: 13 }, children: text }),
            },
            {
                title: 'Módulo',
                width: 150,
                render: (_, record) => (_jsx(Tag, { color: "geekblue", style: { fontSize: 11 }, children: record.modulos?.[0]?.nombre || 'Sin módulo' })),
            },
            {
                title: 'Acceso vía Rol',
                width: 200,
                render: (_, record) => (_jsx(Space, { wrap: true, size: 2, children: (record.rolesAcceso || []).map((rol) => (_jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: rol }, rol))) })),
            },
        ] }));
}
/* ───────── componente principal ───────── */
const UsuarioDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const [sucursalesAuth, setSucursalesAuth] = useState([]);
    const SUCURSALES = useMemo(() => sucursalesAuth.map((s) => s.sucursal), [sucursalesAuth]);
    const SUCURSAL_NOMBRES = useMemo(() => Object.fromEntries(sucursalesAuth.map((s) => [s.sucursal, s.nombre])), [sucursalesAuth]);
    /* estados */
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [pantallasPorSucursal, setPantallasPorSucursal] = useState({});
    const [sucursalActivaTab, setSucursalActivaTab] = useState(0);
    const [cargandoPantallas, setCargandoPantallas] = useState(false);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    /* ─── efectos de montaje ─── */
    useEffect(() => {
        setActiveModule('MUsuario');
        return () => setPageTitleOverride('');
    }, [setActiveModule, setPageTitleOverride]);
    useEffect(() => {
        authApi.obtenerSucursalesAuth()
            .then(setSucursalesAuth)
            .catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales');
        });
    }, []);
    /* ─── carga de datos del usuario ─── */
    const cargarUsuario = useCallback(async () => {
        if (!id)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await usuarioApi.obtenerPorId(securitySucursal, parseInt(id));
            if (!res) {
                message.error('Usuario no encontrado en la sucursal seleccionada.');
                setLoadingError(true);
                return;
            }
            setData(res);
            setPageTitleOverride(res.nombreUsuario);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [id, setPageTitleOverride, securitySucursal]);
    useEffect(() => {
        cargarUsuario();
    }, [cargarUsuario]);
    /* ─── carga de pantallas filtradas por los roles del usuario en la sucursal ─── */
    const cargarPantallas = useCallback(async (sucursal, rolesUsuario) => {
        setCargandoPantallas(true);
        try {
            if (rolesUsuario.length === 0) {
                setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
                return;
            }
            // Obtener detalles completos de cada rol (incluye sus pantallas)
            const promesas = rolesUsuario.map((r) => rolApi.obtenerPorId(securitySucursal, r.id));
            const rolesCompletos = await Promise.all(promesas);
            // Unir pantallas de todos los roles y registrar qué rol da acceso
            const pantallasMap = new Map();
            rolesCompletos.forEach((rolCompleto) => {
                (rolCompleto.pantallas || []).forEach((pantalla) => {
                    const existente = pantallasMap.get(pantalla.id);
                    if (existente) {
                        if (!existente.rolesAcceso.includes(rolCompleto.nombre)) {
                            existente.rolesAcceso.push(rolCompleto.nombre);
                        }
                    }
                    else {
                        pantallasMap.set(pantalla.id, {
                            ...pantalla,
                            rolesAcceso: [rolCompleto.nombre],
                        });
                    }
                });
            });
            setPantallasPorSucursal((prev) => ({
                ...prev,
                [sucursal]: Array.from(pantallasMap.values()),
            }));
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar pantallas');
            setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
        }
        finally {
            setCargandoPantallas(false);
        }
    }, [securitySucursal]);
    /* cuando cambia la sucursal activa o los roles, recargar pantallas filtradas */
    const rolesSucursalActiva = useMemo(() => data?.sucursalesRoles?.find((x) => x.sucursal === sucursalActivaTab)?.roles || [], [data, sucursalActivaTab]);
    useEffect(() => {
        if (!data)
            return;
        cargarPantallas(sucursalActivaTab, rolesSucursalActiva);
    }, [sucursalActivaTab, data, cargarPantallas, rolesSucursalActiva]);
    /* ─── handlers de acciones ─── */
    const handleResetPassword = useCallback(async () => {
        if (!data)
            return;
        try {
            const nuevaClave = await usuarioApi.resetearPassword(securitySucursal, data.id);
            Modal.success({
                title: 'Contraseña reseteada',
                content: `La nueva contraseña temporal es: ${nuevaClave}`,
            });
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al resetear contraseña');
        }
    }, [data, securitySucursal]);
    const handleToggleEstado = useCallback(async () => {
        if (!data)
            return;
        try {
            await usuarioApi.cambiarEstado(securitySucursal, data.id, !data.activo);
            message.success(`Usuario ${data.activo ? 'desactivado' : 'activado'} correctamente`);
            setData({ ...data, activo: !data.activo });
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
        }
    }, [data, securitySucursal]);
    /* ─── render: Informacion General ─── */
    const renderInfoGeneral = () => {
        return (_jsx(Card, { title: "Informaci\u00F3n General", style: { borderRadius: 8, marginBottom: 16 }, children: _jsxs(Descriptions, { column: { xs: 1, sm: 2 }, size: "small", styles: { label: { fontWeight: 500 } }, children: [_jsx(Descriptions.Item, { label: "ID", children: data.id }), _jsx(Descriptions.Item, { label: "Nombre", children: data.nombre }), _jsx(Descriptions.Item, { label: "Usuario", children: _jsx("span", { style: { fontFamily: 'monospace' }, children: data.nombreUsuario }) }), _jsx(Descriptions.Item, { label: "Estado", children: _jsx(EstadoTag, { activo: data.activo }) }), _jsx(Descriptions.Item, { label: "Cambiar clave", children: _jsx(CambiarClaveTag, { debe: data.debeCambiarClave }) }), _jsxs(Descriptions.Item, { label: "Vigencia", children: [data.diasVigencia, " d\u00EDas"] }), _jsx(Descriptions.Item, { label: "Clave no expira", children: _jsx(Tag, { color: data.claveNoExpira ? 'green' : 'default', children: data.claveNoExpira ? 'Sí' : 'No' }) }), _jsx(Descriptions.Item, { label: "\u00DAltimo inicio", children: formatFecha(data.ultimoLogin) })] }) }));
    };
    /* ─── render: Roles y Pantallas ─── */
    const renderRolesPantallas = () => {
        return (_jsx(Card, { title: "Roles y Pantallas", style: { borderRadius: 8, marginBottom: 16 }, children: _jsx(Tabs, { type: "card", activeKey: String(sucursalActivaTab), onChange: (key) => setSucursalActivaTab(Number(key)), items: SUCURSALES.map((s) => ({
                    key: String(s),
                    label: SUCURSAL_NOMBRES[s] || `Sucursal ${s}`,
                    children: (_jsxs("div", { style: { minHeight: 120 }, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Roles asignados" }), rolesSucursalActiva.length === 0 ? (_jsx(Typography.Text, { type: "secondary", style: { fontStyle: 'italic' }, children: "Sin roles asignados en esta sucursal" })) : (_jsx(Space, { wrap: true, size: 4, children: rolesSucursalActiva.map((r) => (_jsx(Tag, { color: "blue", children: r.nombre }, r.id))) }))] }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Pantallas disponibles" }), cargandoPantallas ? (_jsx(Spin, { size: "small" })) : (pantallasPorSucursal[s] || []).length === 0 ? (_jsx(Typography.Text, { type: "secondary", style: { fontStyle: 'italic' }, children: "No hay pantallas disponibles en esta sucursal" })) : renderPantallasGrouped(pantallasPorSucursal[s] || [])] })] })),
                })) }) }));
    };
    /* ─── render: loading ─── */
    if (loading || (!data && !loadingError)) {
        return _jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) });
    }
    if (loadingError && !data) {
        return _jsx(ErrorDetalle, { mensaje: "Error al cargar el usuario", rutaVolver: "/MUsuario" });
    }
    if (!data)
        return null;
    /* ─── render: principal ─── */
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de usuario", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarUsuario, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16 }, children: [_jsx(Button, { type: "link", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/MUsuario'), style: { padding: 0, fontSize: 14 }, children: "Volver a usuarios" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => navigate('/MUsuario/nuevo'), children: "Nuevo" })] }), _jsx(Card, { style: { borderRadius: 8, marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }, children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: data.id, fallback: letraInicial(data.nombre), size: 64 }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 20, fontWeight: 600 }, children: data.nombre }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }, children: [_jsx("span", { className: "paces-text-secondary", style: { fontFamily: 'monospace', fontSize: 14 }, children: data.nombreUsuario }), _jsx(EstadoTag, { activo: data.activo })] })] }), _jsxs(Space, { children: [_jsx(Button, { icon: _jsx(EditOutlined, {}), onClick: () => navigate(`/MUsuario/${data.id}/editar`), children: "Editar" }), _jsx(Button, { icon: _jsx(KeyOutlined, {}), onClick: handleResetPassword, children: "Resetear contrase\u00F1a" }), _jsx(Button, { icon: data.activo ? _jsx(StopOutlined, {}) : _jsx(CheckCircleOutlined, {}), onClick: handleToggleEstado, danger: data.activo, children: data.activo ? 'Desactivar' : 'Activar' })] })] }) }), _jsx(Tabs, { type: "card", defaultActiveKey: "info", items: [
                    {
                        key: 'info',
                        label: 'Información General',
                        children: renderInfoGeneral(),
                    },
                    {
                        key: 'roles',
                        label: 'Roles y Pantallas',
                        children: renderRolesPantallas(),
                    },
                ] })] }));
};
export default UsuarioDetalle;
