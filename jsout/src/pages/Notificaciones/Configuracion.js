import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Modal, Form, Select, Input, Switch, Tag, Tooltip, Alert, message, Empty, Space, Row, Col, } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { notificacionesApi } from '../../api/notificacionesApi';
const MODULOS_OPCIONES = [
    { label: 'Inventario', value: 'Inventario' },
    { label: 'Compras', value: 'Compras' },
    { label: 'Facturacion/DGII', value: 'Facturacion/DGII' },
    { label: 'Contabilidad', value: 'Contabilidad' },
    { label: 'Seguridad', value: 'Seguridad' },
    { label: 'General', value: 'General' },
];
const TIPOS_OPCIONES = [
    { label: 'Alerta', value: 'Alerta' },
    { label: 'Info', value: 'Info' },
    { label: 'Error', value: 'Error' },
    { label: 'Advertencia', value: 'Advertencia' },
    { label: 'Exito', value: 'Exito' },
    { label: 'Ticket', value: 'Ticket' },
];
const DESTINO_TIPOS = [
    { label: 'Usuario', value: 'Usuario' },
    { label: 'Rol', value: 'Rol' },
];
// Componente para la fila de destinatario con select dinámico
const DestinoRow = ({ name, restField, usuarios, roles, onRemove, form }) => {
    const destinoTipo = Form.useWatch(['destinos', name, 'destinoTipo'], form);
    const opcionesDestino = destinoTipo === 'Rol'
        ? (roles || []).map((r) => ({ value: r.id, label: r.nombre }))
        : (usuarios || []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.nombreUsuario})` }));
    return (_jsxs(Row, { gutter: 12, style: { marginBottom: 8, alignItems: 'flex-start' }, children: [_jsx(Col, { span: 8, children: _jsx(Form.Item, { ...restField, name: [name, 'destinoTipo'], rules: [{ required: true, message: 'Obligatorio' }], style: { marginBottom: 0 }, children: _jsx(Select, { placeholder: "Tipo", options: DESTINO_TIPOS }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { ...restField, name: [name, 'destinoID'], rules: [{ required: true, message: 'Obligatorio' }], style: { marginBottom: 0 }, children: _jsx(Select, { placeholder: "Seleccionar...", showSearch: true, filterOption: (input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase()), options: opcionesDestino, notFoundContent: destinoTipo ? 'Sin resultados' : 'Seleccione un tipo primero' }, destinoTipo || 'empty') }) }), _jsx(Col, { span: 4, children: _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: onRemove }) })] }));
};
const Configuracion = () => {
    const sucursal = useAuthStore((s) => s.compania);
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [form] = Form.useForm();
    const [loadingError, setLoadingError] = useState(false);
    const cargarConfigs = useCallback(async () => {
        if (!sucursal)
            return;
        setLoading(true);
        try {
            const data = await notificacionesApi.obtenerConfig(sucursal);
            setConfigs(data || []);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursal]);
    const handleRefresh = useCallback(() => {
        setLoadingError(false);
        cargarConfigs();
    }, [cargarConfigs]);
    const cargarUsuarios = async () => {
        try {
            const data = await notificacionesApi.obtenerUsuarios();
            setUsuarios(data || []);
        }
        catch {
            // Silencioso - se muestra error en el select
        }
    };
    const cargarRoles = async () => {
        try {
            const data = await notificacionesApi.obtenerRoles();
            setRoles(data || []);
        }
        catch {
            // Silencioso
        }
    };
    useEffect(() => {
        cargarConfigs();
        cargarUsuarios();
        cargarRoles();
    }, [cargarConfigs]);
    const abrirNuevo = () => {
        setEditando(null);
        form.resetFields();
        form.setFieldsValue({ activa: true, destinos: [] });
        setModalVisible(true);
    };
    const abrirEditar = (config) => {
        setEditando(config);
        form.setFieldsValue({
            modulo: config.modulo,
            evento: config.evento,
            tipo: config.tipo,
            tituloTemplate: config.tituloTemplate,
            mensajeTemplate: config.mensajeTemplate,
            activa: config.activa,
            destinos: (config.destinos || []).map((d) => ({
                destinoTipo: d.destinoTipo,
                destinoID: d.destinoID,
            })),
        });
        setModalVisible(true);
    };
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            const payload = {
                configID: editando?.configID || 0,
                modulo: values.modulo,
                evento: values.evento,
                tipo: values.tipo,
                tituloTemplate: values.tituloTemplate,
                mensajeTemplate: values.mensajeTemplate,
                activa: values.activa,
                fechaCreacion: editando?.fechaCreacion || new Date().toISOString(),
                destinos: (values.destinos || []).map((d, i) => ({
                    id: editando?.destinos?.[i]?.id || 0,
                    configID: editando?.configID || 0,
                    destinoTipo: d.destinoTipo,
                    destinoID: d.destinoID,
                })),
            };
            await notificacionesApi.guardarConfig(sucursal, payload);
            message.success('Configuración guardada correctamente');
            setModalVisible(false);
            cargarConfigs();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
        }
        finally {
            setGuardando(false);
        }
    };
    const getDestinoLabel = (destino) => {
        if (destino.destinoTipo === 'Usuario') {
            const u = usuarios.find((x) => x.id === destino.destinoID);
            return u ? `${u.nombre} (${u.nombreUsuario})` : `Usuario #${destino.destinoID}`;
        }
        const r = roles.find((x) => x.id === destino.destinoID);
        return r ? r.nombre : `Rol #${destino.destinoID}`;
    };
    const columns = [
        {
            title: 'Módulo',
            dataIndex: 'modulo',
            key: 'modulo',
            width: 150,
            render: (text) => _jsx(Tag, { color: "blue", style: { fontSize: 11 }, children: text }),
        },
        {
            title: 'Evento',
            dataIndex: 'evento',
            key: 'evento',
            width: 160,
            ellipsis: true,
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 120,
            render: (text) => {
                const colores = {
                    Alerta: 'gold', Info: 'blue', Error: 'red', Advertencia: 'orange', Exito: 'green', Ticket: 'purple',
                };
                return _jsx(Tag, { color: colores[text] || 'default', children: text });
            },
        },
        {
            title: 'Activa',
            dataIndex: 'activa',
            key: 'activa',
            width: 80,
            render: (activa) => (_jsx(Tag, { color: activa ? 'green' : 'default', children: activa ? 'Sí' : 'No' })),
        },
        {
            title: 'Destinatarios',
            key: 'destinos',
            width: 250,
            ellipsis: true,
            render: (_, record) => (_jsxs(Space, { wrap: true, size: 4, children: [(record.destinos || []).length === 0 && (_jsx("span", { className: "paces-text-muted", style: { fontSize: 12 }, children: "Sin destinatarios" })), (record.destinos || []).map((d, i) => (_jsx(Tooltip, { title: d.destinoTipo, children: _jsx(Tag, { color: d.destinoTipo === 'Usuario' ? 'cyan' : 'purple', style: { fontSize: 11 }, children: getDestinoLabel(d) }) }, i)))] })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 80,
            fixed: 'right',
            render: (_, record) => (_jsx(Tooltip, { title: "Editar regla", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => abrirEditar(record) }) })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: "Configuraci\u00F3n de Notificaciones" }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: abrirNuevo, children: "Nueva Regla" })] }), loadingError && (_jsx(Alert, { message: "Error al cargar configuraci\u00F3n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarConfigs })] }) }), _jsx(Table, { columns: columns, dataSource: configs, rowKey: "configID", loading: loading, scroll: { x: 900 }, size: "middle", locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay reglas de notificaci\u00F3n configuradas" }) }) }, pagination: false })] }), _jsx(Modal, { title: editando ? 'Editar Regla de Notificación' : 'Nueva Regla de Notificación', open: modalVisible, onCancel: () => setModalVisible(false), onOk: handleGuardar, confirmLoading: guardando, okText: "Guardar", cancelText: "Cancelar", width: 700, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 8, children: _jsx(Form.Item, { name: "modulo", label: "M\u00F3dulo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Select, { placeholder: "Seleccione m\u00F3dulo", options: MODULOS_OPCIONES }) }) }), _jsx(Col, { span: 8, children: _jsx(Form.Item, { name: "evento", label: "Evento", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Ej: StockBajo" }) }) }), _jsx(Col, { span: 8, children: _jsx(Form.Item, { name: "tipo", label: "Tipo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Select, { placeholder: "Seleccione tipo", options: TIPOS_OPCIONES }) }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "tituloTemplate", label: "T\u00EDtulo (template)", children: _jsx(Input, { placeholder: "Template para el t\u00EDtulo" }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "mensajeTemplate", label: "Mensaje (template)", children: _jsx(Input, { placeholder: "Template para el mensaje" }) }) })] }), _jsx(Form.Item, { name: "activa", label: "Regla activa", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }), _jsx(Form.List, { name: "destinos", children: (fields, { add, remove }) => (_jsxs("div", { style: { marginTop: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Destinatarios" }), _jsx(Button, { type: "dashed", size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => add({ destinoTipo: 'Usuario', destinoID: undefined }), children: "Agregar destinatario" })] }), fields.length === 0 && (_jsx("div", { className: "paces-text-muted", style: { fontSize: 13, padding: '8px 0' }, children: "No hay destinatarios configurados" })), fields.map(({ key, name, ...restField }) => (_jsx(DestinoRow, { name: name, restField: restField, usuarios: usuarios, roles: roles, onRemove: () => remove(name), form: form }, key)))] })) })] }) })] }));
};
export default Configuracion;
