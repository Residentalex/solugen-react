import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Select, Spin, message, Tabs, Tag, Space, Typography, Alert, Table, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { usuarioApi } from '../../api/usuarioApi';
import { authApi } from '../../api/authApi';
import { empleadoApi } from '../../api/empleadoApi';
import { rolApi } from '../../api/rolApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import BuscarEmpleadoModal from '../../components/BuscarEmpleadoModal/BuscarEmpleadoModal';
import EntidadImagen from '../../components/EntidadImagen';
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
function letraInicial(nombre) {
    return (nombre || '?').charAt(0).toUpperCase();
}
const UsuarioFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const esEditar = Boolean(id);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const navigationConfirmedRef = useFormularioNavigation();
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [sucursalesAuth, setSucursalesAuth] = useState([]);
    const SUCURSALES = useMemo(() => sucursalesAuth.map((s) => s.sucursal), [sucursalesAuth]);
    const SUCURSAL_NOMBRES = useMemo(() => Object.fromEntries(sucursalesAuth.map((s) => [s.sucursal, toTitleCase(s.nombre)])), [sucursalesAuth]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [data, setData] = useState(null);
    const [empleados, setEmpleados] = useState([]);
    const [buscarEmpleadoOpen, setBuscarEmpleadoOpen] = useState(false);
    const [empleadoLabel, setEmpleadoLabel] = useState('');
    const [sucursalesRolesEdit, setSucursalesRolesEdit] = useState([]);
    const [rolesDisponibles, setRolesDisponibles] = useState({});
    const [sucursalActivaTab, setSucursalActivaTab] = useState(0);
    const [pantallasPorSucursal, setPantallasPorSucursal] = useState({});
    const [cargandoPantallas, setCargandoPantallas] = useState(false);
    const [cargandoRoles, setCargandoRoles] = useState(false);
    const [form] = Form.useForm();
    useEffect(() => {
        authApi.obtenerSucursalesAuth()
            .then(setSucursalesAuth)
            .catch((err) => {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales');
        });
    }, []);
    useEffect(() => {
        setActiveModule('MUsuario');
        updateToolbar({});
        cargarEmpleados();
        // cargarRolesDisponibles se dispara desde el efecto de sucursalesAuth
        if (id)
            cargarUsuario(parseInt(id));
        else
            form.setFieldsValue({ activo: true, claveNoExpira: false, diasVigencia: 30 });
        return () => resetToolbar();
    }, [id]);
    useEffect(() => {
        if (sucursalesAuth.length > 0) {
            cargarRolesDisponibles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sucursalesAuth]);
    const cargarEmpleados = async () => {
        try {
            const emps = await empleadoApi.obtenerTodos(securitySucursal);
            setEmpleados(emps || []);
        }
        catch {
            // silent
        }
    };
    const cargarUsuario = async (userId) => {
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await usuarioApi.obtenerPorId(securitySucursal, userId);
            setData(res);
            form.setFieldsValue({
                nombre: res.nombre,
                nombreUsuario: res.nombreUsuario,
                activo: res.activo,
                claveNoExpira: res.claveNoExpira,
                diasVigencia: res.diasVigencia,
                empleadoID: res.empleadoID,
            });
            setSucursalesRolesEdit(JSON.parse(JSON.stringify(res.sucursalesRoles || [])));
            if (res.empleadoID) {
                try {
                    const emp = await empleadoApi.obtenerPorCodigo(securitySucursal, res.empleadoID);
                    if (emp?.nombre) {
                        setEmpleadoLabel(`${emp.codigo} - ${emp.nombre}`);
                    }
                    else {
                        setEmpleadoLabel(res.empleadoID);
                    }
                }
                catch {
                    setEmpleadoLabel(`${res.empleadoID} (sin nombre)`);
                }
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar usuario');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    };
    const cargarRolesDisponibles = async () => {
        setCargandoRoles(true);
        try {
            const roles = await rolApi.obtenerListado(securitySucursal);
            const rolesMapeados = roles.map((r) => ({ id: r.id, nombre: r.nombre }));
            const map = {};
            SUCURSALES.forEach((s) => { map[s] = rolesMapeados; });
            setRolesDisponibles(map);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar roles');
        }
        finally {
            setCargandoRoles(false);
        }
    };
    const cargarPantallas = useCallback(async (sucursal, rolesUsuario) => {
        setCargandoPantallas(true);
        try {
            if (rolesUsuario.length === 0) {
                setPantallasPorSucursal((prev) => ({ ...prev, [sucursal]: [] }));
                return;
            }
            const promesas = rolesUsuario.map((r) => rolApi.obtenerPorId(securitySucursal, r.id));
            const rolesCompletos = await Promise.all(promesas);
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
    }, []);
    const rolesSucursalActiva = useMemo(() => sucursalesRolesEdit?.find((x) => x.sucursal === sucursalActivaTab)?.roles || [], [sucursalesRolesEdit, sucursalActivaTab]);
    useEffect(() => {
        cargarPantallas(sucursalActivaTab, rolesSucursalActiva);
    }, [sucursalActivaTab, rolesSucursalActiva, cargarPantallas]);
    const handleRolesChange = useCallback((sucursal, selectedIds) => {
        const rolesDisponiblesSuc = rolesDisponibles[sucursal] || [];
        const nuevosRoles = selectedIds
            .map((rid) => rolesDisponiblesSuc.find((r) => r.id === rid))
            .filter(Boolean);
        setSucursalesRolesEdit((prev) => {
            const copia = [...prev];
            const idx = copia.findIndex((x) => x.sucursal === sucursal);
            if (nuevosRoles.length === 0) {
                if (idx >= 0)
                    copia.splice(idx, 1);
            }
            else {
                const entry = {
                    sucursal,
                    nombreSucursal: SUCURSAL_NOMBRES[sucursal] || '',
                    roles: nuevosRoles,
                };
                if (idx >= 0)
                    copia[idx] = entry;
                else
                    copia.push(entry);
            }
            return copia;
        });
    }, [rolesDisponibles]);
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            if (esEditar && data) {
                const payload = {
                    ...data,
                    nombre: values.nombre,
                    nombreUsuario: values.nombreUsuario,
                    activo: values.activo,
                    claveNoExpira: values.claveNoExpira ?? false,
                    diasVigencia: values.diasVigencia,
                    empleadoID: values.empleadoID || data.empleadoID,
                    sucursalesRoles: sucursalesRolesEdit,
                };
                await usuarioApi.actualizar(securitySucursal, payload);
                message.success('Usuario actualizado correctamente');
                navigationConfirmedRef.current = true;
                navigate(`/MUsuario/${data.id}`, { replace: true });
            }
            else {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                const pass = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                const creado = await usuarioApi.crear(securitySucursal, { ...values, contrasena: pass, debeCambiarClave: true, claveNoExpira: values.claveNoExpira ?? false, sucursalesRoles: sucursalesRolesEdit });
                Modal.success({
                    title: 'Usuario creado',
                    content: (_jsxs("div", { children: [_jsx("p", { children: "Usuario creado correctamente." }), _jsxs("p", { children: [_jsx("strong", { children: "Contrase\u00F1a temporal:" }), " ", _jsx("code", { style: { fontSize: 16 }, children: pass })] })] })),
                    onOk: () => {
                        navigationConfirmedRef.current = true;
                        navigate('/MUsuario', { replace: true });
                    },
                });
            }
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar usuario');
        }
        finally {
            setGuardando(false);
        }
    };
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea cancelar los cambios realizados?',
            okText: 'Si, cancelar',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                if (esEditar && data)
                    navigate(`/MUsuario/${data.id}`, { replace: true });
                else
                    navigate('/MUsuario', { replace: true });
            },
        });
    };
    if (esEditar && loading) {
        return _jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) });
    }
    if (esEditar && loadingError) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60 }, children: [_jsx(Alert, { message: "Error al cargar el usuario", type: "error", showIcon: true, style: { marginBottom: 16 } }), _jsx(Button, { onClick: () => navigate('/MUsuario', { replace: true }), children: "Volver a usuarios" })] }));
    }
    if (esEditar && !data)
        return null;
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de usuario", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => id && cargarUsuario(parseInt(id)), children: "Reintentar" }) })), esEditar && data ? (_jsx(Card, { style: { borderRadius: 8, marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }, children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: data.id, fallback: letraInicial(data.nombre), size: 64 }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 20, fontWeight: 600 }, children: data.nombre }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }, children: [_jsx("span", { className: "paces-text-secondary", style: { fontFamily: 'monospace', fontSize: 14 }, children: data.nombreUsuario }), _jsx(Tag, { color: data.activo ? 'green' : 'default', children: data.activo ? 'Activo' : 'Inactivo' })] })] }), _jsxs(Space, { children: [_jsx(PermissionGate, { accion: esEditar ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), onClick: guardar, loading: guardando, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: handleCancelar, disabled: guardando, children: "Cancelar" })] })] }) })) : (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: "Nuevo Usuario" }), _jsxs(Space, { children: [_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), onClick: guardar, loading: guardando, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: handleCancelar, children: "Volver" })] })] })), _jsx(Tabs, { type: "card", defaultActiveKey: "info", items: [
                    {
                        key: 'info',
                        label: 'Información General',
                        children: (_jsx(Card, { title: "Informaci\u00F3n General", style: { borderRadius: 8, marginBottom: 16 }, children: _jsx(Form, { form: form, layout: "vertical", size: "small", children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "nombreUsuario", label: "Usuario", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre de cuenta" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "nombre", label: "Nombre completo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre y apellidos" }) }) }), _jsxs(Col, { xs: 24, sm: 12, lg: 6, children: [_jsx("div", { children: _jsx(Form.Item, { label: "Empleado", style: { marginBottom: 0 }, children: _jsx(Input, { placeholder: " ", value: empleadoLabel, readOnly: true, suffix: _jsx(SearchOutlined, {}), onClick: () => setBuscarEmpleadoOpen(true) }) }) }), _jsx(Form.Item, { name: "empleadoID", hidden: true, children: _jsx(Input, {}) })] }), _jsx(Col, { xs: 12, sm: 8, lg: 3, children: _jsx(Form.Item, { name: "diasVigencia", label: "Vigencia (d\u00EDas)", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(InputNumber, { min: 1, max: 365, style: { width: '100%' } }) }) }), _jsx(Col, { xs: 12, sm: 4, lg: 3, children: _jsx(Form.Item, { name: "claveNoExpira", label: "Clave no expira", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }) }), _jsx(Col, { xs: 12, sm: 4, lg: 3, children: _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }) })] }) }) })),
                    },
                    {
                        key: 'roles',
                        label: 'Roles y Pantallas',
                        children: (_jsx(Card, { title: "Roles y Pantallas", style: { borderRadius: 8, marginBottom: 16 }, children: _jsx(Tabs, { type: "card", activeKey: String(sucursalActivaTab), onChange: (key) => setSucursalActivaTab(Number(key)), items: SUCURSALES.map((s) => ({
                                    key: String(s),
                                    label: SUCURSAL_NOMBRES[s] || `Sucursal ${s}`,
                                    children: (_jsxs("div", { style: { minHeight: 120 }, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Roles asignados" }), rolesSucursalActiva.length === 0 ? (_jsx(Typography.Text, { type: "secondary", style: { fontStyle: 'italic' }, children: "Sin roles asignados en esta sucursal" })) : (_jsx(Space, { wrap: true, size: 4, children: rolesSucursalActiva.map((r) => (_jsx(Tag, { color: "blue", closable: true, onClose: () => {
                                                                const nuevosIds = rolesSucursalActiva
                                                                    .filter((x) => x.id !== r.id)
                                                                    .map((x) => x.id);
                                                                handleRolesChange(s, nuevosIds);
                                                            }, children: r.nombre }, r.id))) }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Agregar roles" }), _jsx(Select, { mode: "multiple", placeholder: "Seleccionar roles...", value: rolesSucursalActiva.map((r) => r.id), onChange: (ids) => handleRolesChange(s, ids), options: rolesDisponibles[s]?.map((r) => ({
                                                            label: r.nombre,
                                                            value: r.id,
                                                        })) || [], style: { width: '100%' }, loading: cargandoRoles, filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) })] }), _jsxs("div", { children: [_jsx(Typography.Text, { strong: true, style: { display: 'block', marginBottom: 8 }, children: "Pantallas disponibles" }), cargandoPantallas ? (_jsx(Spin, { size: "small" })) : (pantallasPorSucursal[s] || []).length === 0 ? (_jsx(Typography.Text, { type: "secondary", style: { fontStyle: 'italic' }, children: "No hay pantallas disponibles en esta sucursal" })) : renderPantallasGrouped(pantallasPorSucursal[s] || [])] })] })),
                                })) }) })),
                    },
                ] }), _jsx(BuscarEmpleadoModal, { open: buscarEmpleadoOpen, onClose: () => setBuscarEmpleadoOpen(false), onSelect: (emp) => {
                    form.setFieldValue('empleadoID', emp.codigo);
                    setEmpleadoLabel(`${emp.codigo} - ${emp.nombre}`);
                    form.setFieldValue('nombre', emp.nombre);
                } })] }));
};
export default UsuarioFormulario;
