import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Select, Switch, Checkbox, Spin, message, Tag, Space, Typography, Alert, Modal, Table, Tooltip, Tabs, Empty, } from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined, FileTextOutlined, TagOutlined, SearchOutlined, PlusOutlined, CheckOutlined, InboxOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { pantallaApi } from '../../api/pantallaApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import FormularioToolbar from '../../components/FormularioToolbar';
const { Text } = Typography;
const OPCIONES_GRUPO = [
    'Maestros',
    'Operaciones',
    'Reportes',
    'Procesos',
    'Configuracion',
    'POS',
    'Equipos',
];
const PantallaFormulario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const esEditar = Boolean(id);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [data, setData] = useState(null);
    // Catálogos
    const [modulosCatalogo, setModulosCatalogo] = useState([]);
    const [accionesCatalogo, setAccionesCatalogo] = useState([]);
    const [entidadesCatalogo, setEntidadesCatalogo] = useState([]);
    const [catalogosLoading, setCatalogosLoading] = useState(false);
    const navigationConfirmedRef = useFormularioNavigation();
    // Acciones seleccionadas
    const [selectedAcciones, setSelectedAcciones] = useState([]);
    // Entidades seleccionadas
    const [entidadesSeleccion, setEntidadesSeleccion] = useState([]);
    // Permisos especiales
    const [permisosEspecialesCatalogo, setPermisosEspecialesCatalogo] = useState([]);
    const [selectedPermisosEspeciales, setSelectedPermisosEspeciales] = useState([]);
    // Estados de la sección Entidades/Documentos Asociados
    const [tabActivo, setTabActivo] = useState('documentos');
    const [busquedaDocs, setBusquedaDocs] = useState('');
    const [busquedaEnts, setBusquedaEnts] = useState('');
    const [form] = Form.useForm();
    const cargarCatalogos = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        setCatalogosLoading(true);
        try {
            const [modulos, acciones, entidades] = await Promise.all([
                pantallaApi.obtenerModulos(sucursalActiva),
                pantallaApi.obtenerAcciones(sucursalActiva),
                pantallaApi.obtenerEntidadesCatalogo(sucursalActiva),
            ]);
            setModulosCatalogo(modulos || []);
            setAccionesCatalogo(acciones || []);
            setEntidadesCatalogo(entidades || []);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setCatalogosLoading(false);
        }
    }, [sucursalActiva]);
    const cargarPermisosPorPantalla = async (pantallaId) => {
        try {
            const result = await permisoEspecialApi.obtenerPorPantalla(securitySucursal, pantallaId);
            setPermisosEspecialesCatalogo(result || []);
            setSelectedPermisosEspeciales((result || []).filter(p => p.asignado).map(p => p.id));
        }
        catch {
            // no crítico
        }
    };
    const cargarPantalla = useCallback(async (pantallaId) => {
        if (sucursalActiva === undefined)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await pantallaApi.obtenerPorId(sucursalActiva, pantallaId);
            setData(res);
            form.setFieldsValue({
                codigo: res.codigo,
                nombre: res.nombre,
                tipo: res.tipo,
                modulos: res.modulos?.map((m) => m.id) || [],
                grupo: res.grupo,
                ruta: res.ruta,
                orden: res.orden,
                esReporte: res.esReporte,
                activo: res.activo,
            });
            setSelectedAcciones(res.acciones || []);
            setEntidadesSeleccion(res.entidades?.map((e) => ({ ...e })) || []);
            cargarPermisosPorPantalla(pantallaId);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar pantalla');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, form]);
    useEffect(() => {
        setActiveModule('MPantalla');
        updateToolbar({});
        cargarCatalogos();
        if (id)
            cargarPantalla(parseInt(id));
        else {
            form.setFieldsValue({ activo: true, esReporte: false, orden: 0, modulos: [] });
            setSelectedAcciones(['VISUALIZAR']);
            setEntidadesSeleccion([]);
        }
        return () => resetToolbar();
    }, [id, setActiveModule, updateToolbar, resetToolbar, cargarCatalogos, cargarPantalla, form]);
    const handleTipoEntidadChange = (index, value) => {
        setEntidadesSeleccion((prev) => prev.map((e, i) => (i === index ? { ...e, tipoEntidad: value || undefined } : e)));
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            if (sucursalActiva === undefined)
                return;
            setGuardando(true);
            const payload = {
                id: data?.id || 0,
                codigo: values.codigo,
                nombre: values.nombre,
                ruta: values.ruta || '',
                tipo: values.tipo || '',
                grupo: values.grupo || '',
                orden: values.orden ?? 0,
                esReporte: values.esReporte ?? false,
                activo: values.activo ?? true,
                modulos: (values.modulos || []).map((modId) => ({ id: modId, nombre: '', orden: 0 })),
                acciones: selectedAcciones,
            };
            let pantallaId;
            if (esEditar && data) {
                await pantallaApi.actualizar(sucursalActiva, payload);
                pantallaId = data.id;
                message.success('Pantalla actualizada correctamente');
            }
            else {
                const creada = await pantallaApi.crear(sucursalActiva, payload);
                pantallaId = creada.id;
                message.success('Pantalla creada correctamente');
            }
            // Asociar entidades después de guardar la pantalla
            if (entidadesSeleccion.length > 0) {
                await pantallaApi.asociarEntidades(sucursalActiva, pantallaId, entidadesSeleccion);
            }
            else if (esEditar && data && data.entidades && data.entidades.length > 0) {
                await pantallaApi.eliminarEntidades(sucursalActiva, pantallaId);
            }
            // Asignar permisos especiales
            await permisoEspecialApi.asignarAPantalla(securitySucursal, pantallaId, selectedPermisosEspeciales);
            navigationConfirmedRef.current = true;
            navigate(`/MPantalla/${pantallaId}`, { replace: true });
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar pantalla');
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
                    navigate(`/MPantalla/${data.id}`, { replace: true });
                else
                    navigate('/MPantalla', { replace: true });
            },
        });
    };
    if (esEditar && loading) {
        return _jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) });
    }
    if (esEditar && loadingError) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60 }, children: [_jsx(Alert, { message: "Error al cargar la pantalla", type: "error", showIcon: true, style: { marginBottom: 16 } }), _jsx(Button, { onClick: () => navigate('/MPantalla', { replace: true }), children: "Volver a pantallas" })] }));
    }
    if (esEditar && !data)
        return null;
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar detalle de pantalla", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => id && cargarPantalla(parseInt(id)), children: "Reintentar" }) })), _jsx(FormularioToolbar, { saving: guardando, mode: esEditar ? 'editar' : 'crear', onGuardar: guardar, onCancelar: handleCancelar }), _jsxs(Form, { form: form, layout: "vertical", size: "small", style: { marginBottom: 16 }, children: [_jsx(Card, { title: "Datos Generales", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: 16, children: [_jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. MPantalla", maxLength: 30 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Pantallas del Sistema", maxLength: 100 }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "tipo", label: "Tipo", children: _jsx(Select, { placeholder: "Seleccione tipo", allowClear: true, children: ['MAESTRO', 'DOCUMENTO', 'CONFIGURACION', 'CONSULTA', 'OPERACION', 'REPORTE', 'ENCABEZADO'].map((t) => (_jsx(Select.Option, { value: t, children: t }, t))) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "grupo", label: "Grupo", children: _jsx(Select, { placeholder: "Seleccione grupo", allowClear: true, children: OPCIONES_GRUPO.map((g) => (_jsx(Select.Option, { value: g, children: g }, g))) }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "orden", label: "Orden", children: _jsx(InputNumber, { min: 0, style: { width: '100%' }, placeholder: "0" }) }) }), _jsx(Col, { xs: 24, sm: 12, lg: 8, children: _jsx(Form.Item, { name: "ruta", label: "Ruta", children: _jsx(Input, { placeholder: "Ej. /admin/pantallas", maxLength: 200 }) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 4, children: _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", initialValue: true, children: _jsx(Switch, {}) }) }), _jsx(Col, { xs: 12, sm: 6, lg: 4, children: _jsx(Form.Item, { name: "esReporte", label: "\u00BFEs reporte?", valuePropName: "checked", children: _jsx(Switch, {}) }) })] }) }), _jsx(Card, { title: "M\u00F3dulos", className: "paces-card", style: { marginBottom: 16 }, children: _jsx(Form.Item, { name: "modulos", label: "M\u00F3dulos", children: _jsx(Select, { mode: "multiple", placeholder: "Seleccione m\u00F3dulos", showSearch: true, optionFilterProp: "children", loading: catalogosLoading, children: modulosCatalogo.map((m) => (_jsx(Select.Option, { value: m.id, children: m.nombre }, m.id))) }) }) })] }), _jsx(Card, { title: "Acciones de la Pantalla", className: "paces-card", style: { marginBottom: 16 }, children: accionesCatalogo.length === 0 && !catalogosLoading ? (_jsx(Text, { type: "secondary", children: "No hay acciones disponibles. Consulte con su administrador." })) : (_jsx(Checkbox.Group, { value: selectedAcciones, onChange: (checkedValues) => setSelectedAcciones(checkedValues), children: _jsx(Row, { gutter: [16, 8], children: accionesCatalogo.map((accion) => (_jsx(Col, { xs: 12, sm: 8, md: 6, lg: 4, children: _jsx(Tooltip, { title: `Código: ${accion.codigo}`, children: _jsx(Checkbox, { value: accion.codigo, children: accion.nombre }) }) }, accion.codigo))) }) })) }), esEditar && (_jsx(Card, { title: "Permisos Especiales", className: "paces-card", style: { marginBottom: 16 }, children: permisosEspecialesCatalogo.length === 0 ? (_jsx(Text, { type: "secondary", children: "No hay permisos especiales disponibles." })) : (_jsx(Checkbox.Group, { value: selectedPermisosEspeciales, onChange: (checkedValues) => setSelectedPermisosEspeciales(checkedValues), children: _jsx(Row, { gutter: [16, 8], children: permisosEspecialesCatalogo
                            .filter(p => p.activo)
                            .map((permiso) => (_jsx(Col, { xs: 12, sm: 8, md: 6, lg: 4, children: _jsx(Checkbox, { value: permiso.id, children: permiso.nombre || permiso.codigo }) }, permiso.id))) }) })) })), !esEditar && (_jsx(Alert, { message: "Los permisos especiales se asignan despu\u00E9s de guardar la pantalla.", type: "info", showIcon: true, style: { marginBottom: 16 } })), _jsx(Card, { title: "Entidades/Documentos Asociados", className: "paces-card", style: { marginBottom: 16 }, children: _jsxs(Row, { gutter: [24, 16], children: [_jsx(Col, { xs: 24, lg: 10, children: _jsx(Tabs, { type: "line", activeKey: tabActivo, onChange: setTabActivo, items: [
                                    {
                                        key: 'documentos',
                                        label: _jsxs("span", { children: [_jsx(FileTextOutlined, {}), " Documentos (", entidadesCatalogo.filter(e => e.tipo === 'D').length, ")"] }),
                                        children: (_jsxs("div", { children: [_jsx(Input, { placeholder: "Buscar documento...", prefix: _jsx(SearchOutlined, {}), allowClear: true, size: "small", style: { marginBottom: 8 }, value: busquedaDocs, onChange: (e) => setBusquedaDocs(e.target.value) }), _jsxs("div", { style: { maxHeight: 320, overflowY: 'auto' }, children: [entidadesCatalogo
                                                            .filter(e => e.tipo === 'D')
                                                            .filter(e => !busquedaDocs || e.codigo.toLowerCase().includes(busquedaDocs.toLowerCase()) || e.descripcion.toLowerCase().includes(busquedaDocs.toLowerCase()))
                                                            .sort((a, b) => a.codigo.localeCompare(b.codigo))
                                                            .map(e => {
                                                            const yaSeleccionado = entidadesSeleccion.some(s => s.entidadCodigo === e.codigo);
                                                            return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, marginBottom: 2, cursor: 'default' }, className: "paces-row-hover", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }, children: [_jsx(FileTextOutlined, { style: { color: '#556ee6', flexShrink: 0 } }), _jsxs("div", { style: { overflow: 'hidden' }, children: [_jsx(Text, { style: { fontSize: 13 }, children: e.codigo }), _jsx(Text, { type: "secondary", style: { fontSize: 12, marginLeft: 6, display: 'inline-block' }, ellipsis: true, children: e.descripcion })] })] }), yaSeleccionado ? (_jsx(Button, { type: "text", size: "small", disabled: true, icon: _jsx(CheckOutlined, { style: { color: '#34c38f' } }) })) : (_jsx(Button, { type: "link", size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => setEntidadesSeleccion(prev => [...prev, { id: 0, entidadCodigo: e.codigo, tipoEntidad: undefined, orden: prev.length + 1 }]) }))] }, e.codigo));
                                                        }), entidadesCatalogo.filter(e => e.tipo === 'D').length === 0 && (_jsx(Empty, { description: "Cargando...", image: Empty.PRESENTED_IMAGE_SIMPLE }))] })] })),
                                    },
                                    {
                                        key: 'entidades',
                                        label: _jsxs("span", { children: [_jsx(TagOutlined, { style: { color: '#f1734f' } }), " Entidades (", entidadesCatalogo.filter(e => e.tipo === 'E').length, ")"] }),
                                        children: (_jsxs("div", { children: [_jsx(Input, { placeholder: "Buscar entidad...", prefix: _jsx(SearchOutlined, {}), allowClear: true, size: "small", style: { marginBottom: 8 }, value: busquedaEnts, onChange: (e) => setBusquedaEnts(e.target.value) }), _jsxs("div", { style: { maxHeight: 320, overflowY: 'auto' }, children: [entidadesCatalogo
                                                            .filter(e => e.tipo === 'E')
                                                            .filter(e => !busquedaEnts || e.codigo.toLowerCase().includes(busquedaEnts.toLowerCase()) || e.descripcion.toLowerCase().includes(busquedaEnts.toLowerCase()))
                                                            .sort((a, b) => a.codigo.localeCompare(b.codigo))
                                                            .map(e => {
                                                            const yaSeleccionado = entidadesSeleccion.some(s => s.entidadCodigo === e.codigo);
                                                            return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 4, marginBottom: 2, cursor: 'default' }, className: "paces-row-hover", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }, children: [_jsx(TagOutlined, { style: { color: '#f1734f', flexShrink: 0 } }), _jsxs("div", { style: { overflow: 'hidden' }, children: [_jsx(Text, { style: { fontSize: 13 }, children: e.codigo }), _jsx(Text, { type: "secondary", style: { fontSize: 12, marginLeft: 6, display: 'inline-block' }, ellipsis: true, children: e.descripcion })] })] }), yaSeleccionado ? (_jsx(Button, { type: "text", size: "small", disabled: true, icon: _jsx(CheckOutlined, { style: { color: '#34c38f' } }) })) : (_jsx(Button, { type: "link", size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => setEntidadesSeleccion(prev => [...prev, { id: 0, entidadCodigo: e.codigo, tipoEntidad: undefined, orden: prev.length + 1 }]) }))] }, e.codigo));
                                                        }), entidadesCatalogo.filter(e => e.tipo === 'E').length === 0 && (_jsx(Empty, { description: "Cargando...", image: Empty.PRESENTED_IMAGE_SIMPLE }))] })] })),
                                    },
                                ] }) }), _jsxs(Col, { xs: 24, lg: 14, children: [_jsx(Text, { strong: true, style: { fontSize: 14 }, children: "Asociaciones configuradas" }), _jsxs(Text, { type: "secondary", style: { marginLeft: 8, fontSize: 12 }, children: ["\u00B7 ", entidadesSeleccion.length, " \u00EDtems"] }), entidadesSeleccion.length === 0 ? (_jsx("div", { style: { marginTop: 16 }, children: _jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "Sin asociaciones configuradas" }) })) : (_jsxs(_Fragment, { children: [_jsx(Table, { dataSource: entidadesSeleccion, rowKey: "entidadCodigo", size: "small", pagination: false, className: "paces-list-table", style: { marginTop: 8 }, columns: [
                                                {
                                                    title: 'Código',
                                                    dataIndex: 'entidadCodigo',
                                                    width: 200,
                                                    render: (codigo, record) => {
                                                        const entidad = entidadesCatalogo.find(e => e.codigo === codigo);
                                                        const esDocumento = entidad?.tipo === 'D';
                                                        return (_jsxs("span", { children: [esDocumento ? (_jsx(FileTextOutlined, { style: { color: '#556ee6', marginRight: 6 } })) : (_jsx(TagOutlined, { style: { color: '#f1734f', marginRight: 6 } })), _jsx(Text, { code: true, children: codigo }), entidad && _jsx(Text, { type: "secondary", style: { marginLeft: 6, fontSize: 12 }, children: entidad.descripcion })] }));
                                                    },
                                                },
                                                {
                                                    title: 'Entidad opcional',
                                                    width: 200,
                                                    render: (_, _record, index) => {
                                                        const entidad = entidadesCatalogo.find(e => e.codigo === _record.entidadCodigo);
                                                        const esDocumento = entidad?.tipo === 'D';
                                                        return esDocumento ? (_jsx(Select, { size: "small", style: { width: '100%' }, placeholder: "Sin entidad", allowClear: true, showSearch: true, optionFilterProp: "label", value: _record.tipoEntidad, onChange: (val) => handleTipoEntidadChange(index, val), options: entidadesCatalogo
                                                                .filter(e => e.tipo === 'E')
                                                                .map(e => ({
                                                                value: e.codigo,
                                                                label: `${e.codigo} · ${e.descripcion}`,
                                                            })) })) : (_jsx(Tooltip, { title: "Solo aplica a documentos", children: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u2014" }) }));
                                                    },
                                                },
                                                {
                                                    title: 'Orden',
                                                    width: 80,
                                                    render: (_, _record, index) => (_jsx(InputNumber, { size: "small", min: 0, precision: 0, controls: false, style: { width: 60 }, value: _record.orden, onChange: (val) => {
                                                            const nuevos = [...entidadesSeleccion];
                                                            nuevos[index] = { ...nuevos[index], orden: val ?? 0 };
                                                            setEntidadesSeleccion(nuevos);
                                                        } })),
                                                },
                                                {
                                                    title: '',
                                                    width: 50,
                                                    render: (_, record) => (_jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => {
                                                            setEntidadesSeleccion(prev => prev.filter(e => e.entidadCodigo !== record.entidadCodigo));
                                                        } })),
                                                },
                                            ] }), _jsx("div", { style: { marginTop: 8 }, children: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [_jsx(FileTextOutlined, { style: { marginRight: 4 } }), " Documento \u00A0", _jsx(TagOutlined, { style: { marginRight: 4 } }), " Entidad \u00A0\u00B7\u00A0 La entidad opcional solo aplica a documentos"] }) })] }))] })] }) })] }));
};
export default PantallaFormulario;
