import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Checkbox, Spin, message, Grid, Collapse, Alert, Modal, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
import { useMemo } from 'react';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';
const RolFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const screens = Grid.useBreakpoint();
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const navigationConfirmedRef = useFormularioNavigation();
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [pantallasDisponibles, setPantallasDisponibles] = useState([]);
    // Catalogo de permisos especiales (id, codigo, nombre, tipoValor) — informacion de referencia
    const [catalogoPermisosEspeciales, setCatalogoPermisosEspeciales] = useState([]);
    // Valores de permisos por pantalla: clave "${pantallaId}-${permisoId}" → { valor, valorNumerico }
    const [permisosPorPantalla, setPermisosPorPantalla] = useState({});
    const [cargandoPermisosEspeciales, setCargandoPermisosEspeciales] = useState(false);
    // Deduplicar por id (safety: si backend devuelve la misma pantalla múltiples veces)
    const pantallasUnicas = useMemo(() => {
        const map = new Map();
        for (const pp of pantallasDisponibles) {
            if (map.has(pp.id)) {
                const existing = map.get(pp.id);
                existing.acciones = [...new Set([...existing.acciones, ...pp.acciones])];
            }
            else {
                map.set(pp.id, { ...pp });
            }
        }
        return Array.from(map.values());
    }, [pantallasDisponibles]);
    // Agrupar por módulo → tipo
    const gruposPorModulo = useMemo(() => {
        const modulos = new Map();
        for (const pp of pantallasUnicas) {
            const modsAsignados = pp.modulos || [];
            if (modsAsignados.length === 0) {
                // Sin módulo
                const keyMod = 'mod-0';
                if (!modulos.has(keyMod)) {
                    modulos.set(keyMod, { nombre: 'Sin módulo', tipos: new Map() });
                }
                const modulo = modulos.get(keyMod);
                const tipo = pp.tipo || 'General';
                if (!modulo.tipos.has(tipo))
                    modulo.tipos.set(tipo, []);
                modulo.tipos.get(tipo).push(pp);
            }
            else {
                for (const m of modsAsignados) {
                    const keyMod = `mod-${m.id}`;
                    if (!modulos.has(keyMod)) {
                        modulos.set(keyMod, { nombre: m.nombre || `Módulo ${m.id}`, tipos: new Map() });
                    }
                    const modulo = modulos.get(keyMod);
                    const tipo = pp.tipo || 'General';
                    if (!modulo.tipos.has(tipo))
                        modulo.tipos.set(tipo, []);
                    modulo.tipos.get(tipo).push(pp);
                }
            }
        }
        return modulos;
    }, [pantallasUnicas]);
    const [selectedPantallas, setSelectedPantallas] = useState({});
    const [rolData, setRolData] = useState(null);
    const [form] = Form.useForm();
    useEffect(() => {
        setActiveModule('MROL');
        updateToolbar({});
        cargarDatos();
        return () => resetToolbar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);
    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [pantallas] = await Promise.all([
                rolApi.obtenerPantallasDisponibles(securitySucursal),
            ]);
            setPantallasDisponibles(pantallas || []);
            if (id) {
                const rol = await rolApi.obtenerPorId(securitySucursal, parseInt(id));
                setRolData(rol);
                form.setFieldsValue({
                    nombre: rol.nombre,
                    descripcion: rol.descripcion,
                    activo: rol.activo,
                });
                const sel = {};
                // El backend devuelve PantallaDTO[] plano, no PantallaFullDTO[] anidado
                const pantallas = (rol.pantallas || []);
                for (const pp of pantallas) {
                    sel[pp.id] = [...(pp.acciones || [])];
                }
                setSelectedPantallas(sel);
                setCargandoPermisosEspeciales(true);
                try {
                    const result = await permisoEspecialApi.obtenerPorRol(securitySucursal, parseInt(id));
                    // Construir catalogo deduplicado por id (para tener id, codigo, nombre, tipoValor)
                    const catalogMap = new Map();
                    for (const p of result || []) {
                        if (!catalogMap.has(p.id)) {
                            catalogMap.set(p.id, { id: p.id, codigo: p.codigo, nombre: p.nombre, activo: p.activo, valor: p.valor, tipoValor: p.tipoValor, valorNumerico: p.valorNumerico, pantallaId: p.pantallaId });
                        }
                    }
                    setCatalogoPermisosEspeciales(Array.from(catalogMap.values()));
                    // Construir mapa de valores por pantalla
                    const map = {};
                    for (const p of result || []) {
                        const pantallaId = p.pantallaId ?? 0;
                        const key = `${pantallaId}-${p.id}`;
                        map[key] = { valor: p.valor, valorNumerico: p.valorNumerico };
                    }
                    setPermisosPorPantalla(map);
                }
                catch {
                    // no crítico, los permisos especiales se cargan aparte
                }
                finally {
                    setCargandoPermisosEspeciales(false);
                }
            }
            else {
                form.setFieldsValue({ activo: true });
                try {
                    const catalogo = await permisoEspecialApi.obtenerListado(securitySucursal);
                    setCatalogoPermisosEspeciales((catalogo || []).filter(p => p.activo));
                    // permisosPorPantalla se queda vacio (sin valores asignados aun)
                }
                catch { /* ignorar */ }
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
            setLoadingError(true);
            if (id)
                navigate('/MROL', { replace: true });
        }
        finally {
            setLoading(false);
        }
    };
    const handleRefresh = useCallback(() => {
        cargarDatos();
        setLoadingError(false);
    }, [id]);
    const handleToggleAccion = (pantallaId, accionCodigo, checked) => {
        setSelectedPantallas((prev) => {
            const current = prev[pantallaId] || [];
            const updated = checked
                ? [...current, accionCodigo]
                : current.filter((a) => a !== accionCodigo);
            return { ...prev, [pantallaId]: updated };
        });
    };
    const handleTogglePantalla = (pantallaId, checked, todasAcciones) => {
        setSelectedPantallas((prev) => ({
            ...prev,
            [pantallaId]: checked ? todasAcciones : [],
        }));
    };
    const handleTogglePermisoEspecial = (pantallaId, permisoId, checked, valorNumerico) => {
        const key = `${pantallaId}-${permisoId}`;
        setPermisosPorPantalla((prev) => ({
            ...prev,
            [key]: { valor: checked, valorNumerico: valorNumerico ?? prev[key]?.valorNumerico },
        }));
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            // El backend espera PantallaDTO[] plano: { id, acciones: string[] }
            const pantallasPayload = Object.entries(selectedPantallas)
                .filter(([, accs]) => accs.length > 0)
                .map(([pantallaId, accs]) => ({
                id: parseInt(pantallaId),
                acciones: accs,
            }));
            const payload = {
                id: rolData?.id || 0,
                nombre: values.nombre,
                descripcion: values.descripcion || '',
                activo: values.activo ?? true,
                pantallas: pantallasPayload,
            };
            let rolId = rolData?.id || 0;
            if (id) {
                await rolApi.actualizar(securitySucursal, payload);
                message.success('Rol actualizado correctamente');
            }
            else {
                const creado = await rolApi.crear(securitySucursal, payload);
                rolId = creado.id;
                message.success('Rol creado correctamente');
            }
            try {
                // Agrupar permisos por pantallaId
                const permisosPorPantallaId = {};
                for (const [key, val] of Object.entries(permisosPorPantalla)) {
                    const [pantallaIdStr, permisoIdStr] = key.split('-');
                    const pantallaId = parseInt(pantallaIdStr, 10);
                    const permisoId = parseInt(permisoIdStr, 10);
                    if (!val.valor && !((val.valorNumerico ?? 0) > 0))
                        continue;
                    if (!permisosPorPantallaId[pantallaId])
                        permisosPorPantallaId[pantallaId] = [];
                    const permCatalogo = catalogoPermisosEspeciales.find(p => p.id === permisoId);
                    permisosPorPantallaId[pantallaId].push({
                        permisoId,
                        valor: val.valor,
                        valorNumerico: permCatalogo?.tipoValor === 'NUMERICO' ? val.valorNumerico : undefined,
                    });
                }
                for (const [pantallaId, payloadPermisos] of Object.entries(permisosPorPantallaId)) {
                    if (payloadPermisos.length > 0) {
                        await permisoEspecialApi.asignarARol(securitySucursal, rolId, parseInt(pantallaId), payloadPermisos);
                    }
                }
            }
            catch {
                // no crítico, el rol ya se guardó
            }
            navigationConfirmedRef.current = true;
            navigate('/MROL', { replace: true });
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar rol');
        }
        finally {
            setGuardando(false);
        }
    };
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando..." })] }));
    }
    const isSmall = !screens.md;
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }, children: [loadingError && (_jsx(Alert, { message: "Error al cargar formulario de rol", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 8,
                }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: id ? 'Editar Rol' : 'Nuevo Rol' }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => {
                                    Modal.confirm({
                                        title: 'Cancelar',
                                        icon: _jsx(ExclamationCircleOutlined, {}),
                                        content: '¿Está seguro que desea cancelar los cambios realizados?',
                                        okText: 'Si, cancelar',
                                        cancelText: 'No, continuar editando',
                                        okButtonProps: { danger: true },
                                        onOk: () => {
                                            navigationConfirmedRef.current = true;
                                            navigate('/MROL', { replace: true });
                                        },
                                    });
                                }, children: "Volver" }), _jsx(PermissionGate, { accion: id ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: guardando, onClick: guardar, children: "Guardar" }) })] })] }), _jsxs(Row, { gutter: [16, 16], style: { flex: 1 }, children: [_jsx(Col, { xs: 24, md: 8, children: _jsxs(Card, { className: "paces-card", style: { height: '100%' }, children: [_jsxs(Form, { form: form, layout: "vertical", size: isSmall ? 'middle' : undefined, children: [_jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Nombre del rol" }) }), _jsx(Form.Item, { name: "descripcion", label: "Descripci\u00F3n", children: _jsx(Input.TextArea, { rows: 3, placeholder: "Descripci\u00F3n del rol" }) }), _jsx(Form.Item, { name: "activo", label: "Estado", valuePropName: "checked", initialValue: true, children: _jsx(Switch, { checkedChildren: "Activo", unCheckedChildren: "Inactivo" }) })] }), id && (_jsxs("div", { style: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--paces-border)' }, children: [_jsxs("div", { className: "paces-text-muted", style: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }, children: ["Usuarios Asignados (", rolData?.nombresUsuarios?.length || 0, ")"] }), (rolData?.nombresUsuarios || []).length === 0 ? (_jsx("span", { className: "paces-text-muted", style: { fontSize: 13 }, children: "Sin usuarios" })) : (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4 }, children: (rolData?.nombresUsuarios || []).map((nombre, i) => (_jsx(Tag, { color: "geekblue", children: nombre }, i))) }))] }))] }) }), _jsx(Col, { xs: 24, md: 16, style: { height: '100%' }, children: _jsx(Card, { className: "paces-card", title: "Permisos por Pantalla", style: { height: '100%', display: 'flex', flexDirection: 'column' }, styles: { body: { flex: 1, overflow: 'auto', padding: 16 } }, children: pantallasUnicas.length === 0 ? (_jsx(Spin, { size: "small" })) : (_jsx("div", { style: { padding: 4 }, children: _jsx(Collapse, { ghost: true, defaultActiveKey: [], items: Array.from(gruposPorModulo.entries()).map(([key, modulo]) => ({
                                        key,
                                        label: (_jsxs("span", { style: {
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: '#556ee6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }, children: [_jsx("span", { style: { fontSize: 18 }, children: "\u25C8" }), modulo.nombre] })),
                                        children: (_jsx("div", { style: { paddingTop: 8 }, children: Array.from(modulo.tipos.entries()).map(([tipo, pantallas]) => (_jsxs("div", { style: { marginBottom: 16 }, children: [tipo !== 'General' && (_jsx("div", { style: {
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 0.5,
                                                            color: '#8c8c8c',
                                                            marginBottom: 8,
                                                            paddingLeft: 4,
                                                        }, children: tipo })), pantallas.map((pp) => {
                                                        const pantallaId = pp.id;
                                                        const selected = selectedPantallas[pantallaId] || [];
                                                        const todas = pp.acciones;
                                                        const todasSeleccionadas = todas.length > 0 && todas.every((a) => selected.includes(a));
                                                        const algunaSeleccionada = selected.length > 0;
                                                        return (_jsxs("div", { style: {
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                padding: '6px 8px',
                                                                borderRadius: 6,
                                                                marginBottom: 4,
                                                                background: algunaSeleccionada ? 'var(--paces-selected-bg)' : 'var(--paces-topbar-search-bg)',
                                                                border: algunaSeleccionada
                                                                    ? '1px solid var(--paces-primary)'
                                                                    : '1px solid transparent',
                                                                flexWrap: 'wrap',
                                                                gap: 4,
                                                            }, children: [_jsx(Checkbox, { checked: todasSeleccionadas, indeterminate: algunaSeleccionada && !todasSeleccionadas, onChange: (e) => handleTogglePantalla(pantallaId, e.target.checked, todas), style: {
                                                                        minWidth: 150,
                                                                        fontWeight: 500,
                                                                        fontSize: 13,
                                                                        flexShrink: 0,
                                                                    }, children: pp.nombre }), _jsx("div", { style: {
                                                                        display: 'flex',
                                                                        flexWrap: 'wrap',
                                                                        gap: 3,
                                                                        alignItems: 'center',
                                                                    }, children: pp.acciones.map((acc) => (_jsx("div", { style: {
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            padding: '1px 2px',
                                                                            borderRadius: 4,
                                                                            background: selected.includes(acc)
                                                                                ? 'var(--paces-hover-bg)'
                                                                                : 'transparent',
                                                                            border: selected.includes(acc)
                                                                                ? '1px solid var(--paces-primary)'
                                                                                : '1px solid var(--paces-border)',
                                                                        }, children: _jsx(Checkbox, { checked: selected.includes(acc), onChange: (e) => handleToggleAccion(pantallaId, acc, e.target.checked), style: { fontSize: 12, marginRight: 0 }, children: _jsx("span", { style: { fontSize: 12 }, children: acc }) }) }, `${pantallaId}-${acc}`))) }), pp.permisosEspeciales && pp.permisosEspeciales.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4, marginLeft: 24, width: '100%' }, children: pp.permisosEspeciales.map((peCodigo) => {
                                                                        const permisoCatalogo = catalogoPermisosEspeciales.find(p => p.codigo === peCodigo);
                                                                        if (!permisoCatalogo)
                                                                            return null;
                                                                        const key = `${pantallaId}-${permisoCatalogo.id}`;
                                                                        // Buscar valor especifico de esta pantalla, o global (pantallaId=0) como fallback
                                                                        const valorActual = permisosPorPantalla[key] ?? permisosPorPantalla[`0-${permisoCatalogo.id}`] ?? { valor: false };
                                                                        const esNumerico = permisoCatalogo.tipoValor === 'NUMERICO';
                                                                        const checked = valorActual.valor;
                                                                        return (_jsx("div", { style: {
                                                                                display: 'inline-flex', alignItems: 'center', padding: '1px 2px',
                                                                                borderRadius: 4, fontSize: 11,
                                                                                background: checked ? 'var(--paces-selected-bg)' : 'transparent',
                                                                                border: checked ? '1px solid var(--paces-primary)' : '1px solid var(--paces-border)',
                                                                                gap: 4,
                                                                            }, children: esNumerico ? (_jsxs(_Fragment, { children: [_jsxs("span", { style: { fontSize: 11, marginRight: 2 }, children: [permisoCatalogo.nombre || peCodigo, ":"] }), _jsx(InputNumber, { min: 0, step: 0.01, size: "small", style: { width: 90 }, value: valorActual.valorNumerico, onChange: (val) => {
                                                                                            handleTogglePermisoEspecial(pantallaId, permisoCatalogo.id, true, val ?? 0);
                                                                                        }, placeholder: "Tope" })] })) : (_jsx(Checkbox, { checked: checked, onChange: (e) => {
                                                                                    handleTogglePermisoEspecial(pantallaId, permisoCatalogo.id, e.target.checked);
                                                                                }, style: { fontSize: 11, marginRight: 0 }, children: _jsx("span", { style: { fontSize: 11 }, children: permisoCatalogo.nombre || peCodigo }) })) }, peCodigo));
                                                                    }) }))] }, `p-${pantallaId}`));
                                                    })] }, tipo))) })),
                                    })) }) })) }) })] })] }));
};
export default RolFormulario;
