import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Button, Row, Col, message, Space, } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { notificacionesApi } from '../../api/notificacionesApi';
import { useCompanyStore } from '../../stores/companyStore';
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
const DestinoRow = ({ name, restField, usuarios, roles, onRemove, form }) => {
    const destinoTipo = Form.useWatch(['destinos', name, 'destinoTipo'], form);
    const opcionesDestino = destinoTipo === 'Rol'
        ? (roles || []).map((r) => ({ value: r.id, label: r.nombre }))
        : (usuarios || []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.nombreUsuario})` }));
    return (_jsxs(Row, { gutter: 12, style: { marginBottom: 8, alignItems: 'flex-start' }, children: [_jsx(Col, { span: 8, children: _jsx(Form.Item, { ...restField, name: [name, 'destinoTipo'], rules: [{ required: true, message: 'Obligatorio' }], style: { marginBottom: 0 }, children: _jsx(Select, { placeholder: "Tipo", options: DESTINO_TIPOS }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { ...restField, name: [name, 'destinoID'], rules: [{ required: true, message: 'Obligatorio' }], style: { marginBottom: 0 }, children: _jsx(Select, { placeholder: "Seleccionar...", showSearch: true, filterOption: (input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase()), options: opcionesDestino, notFoundContent: destinoTipo ? 'Sin resultados' : 'Seleccione un tipo primero' }, destinoTipo || 'empty') }) }), _jsx(Col, { span: 4, children: _jsx(Button, { type: "text", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: onRemove }) })] }));
};
const NotificacionSQLFormulario = ({ visible, editando, onClose, onGuardado, }) => {
    const [form] = Form.useForm();
    const [guardando, setGuardando] = useState(false);
    const [probando, setProbando] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState([]);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    const SUCURSALES_OPCIONES = (sucursalesData || [])
        .filter((s) => s.sucursal >= 0 && s.sucursal <= 3)
        .map((s) => ({ label: s.nombre, value: String(s.sucursal) }));
    useEffect(() => {
        if (visible) {
            cargarUsuarios();
            cargarRoles();
            if (editando) {
                form.setFieldsValue({
                    nombre: editando.nombre,
                    sqlConsulta: editando.sqlConsulta,
                    sucursalIDs: editando.sucursalIDs,
                    columnaTitulo: editando.columnaTitulo,
                    columnaMensaje: editando.columnaMensaje,
                    tipo: editando.tipo,
                    activo: editando.activo,
                    intervaloMinutos: editando.intervaloMinutos,
                    destinos: (editando.destinos || []).map((d) => ({
                        destinoTipo: d.destinoTipo,
                        destinoID: d.destinoID,
                    })),
                });
                setSucursalesSeleccionadas(editando.sucursalIDs?.split(',').filter(Boolean) || []);
            }
            else {
                form.resetFields();
                form.setFieldsValue({ activo: true, tipo: 'Info', intervaloMinutos: 5, destinos: [] });
                setSucursalesSeleccionadas([]);
            }
        }
    }, [visible, editando, form]);
    const cargarUsuarios = async () => {
        try {
            const data = await notificacionesApi.obtenerUsuarios();
            setUsuarios(data || []);
        }
        catch {
            // Silencioso
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
    const handleProbar = async () => {
        const sql = form.getFieldValue('sqlConsulta');
        if (!sql?.trim()) {
            message.warning('Escriba una consulta SQL primero');
            return;
        }
        setProbando(true);
        try {
            const result = editando
                ? await notificacionesApi.probarSQLConfig(editando.id)
                : await notificacionesApi.probarSQLDirecto(sql);
            message.success(`Consulta ejecutada: ${result.total} filas obtenidas`);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al ejecutar la consulta SQL');
        }
        finally {
            setProbando(false);
        }
    };
    const validarFormulario = () => {
        const values = form.getFieldsValue();
        if (!values.nombre?.trim())
            return 'El nombre es obligatorio';
        if (!values.sqlConsulta?.trim())
            return 'La consulta SQL es obligatoria';
        if (!values.tipo)
            return 'El tipo es obligatorio';
        if (!values.intervaloMinutos || values.intervaloMinutos < 1)
            return 'El intervalo debe ser mayor a 0';
        if (sucursalesSeleccionadas.length === 0)
            return 'Seleccione al menos una sucursal destino';
        if (!values.destinos || values.destinos.length === 0)
            return 'Debe agregar al menos un destinatario';
        return null;
    };
    const handleGuardar = async () => {
        const error = validarFormulario();
        if (error) {
            message.error(error);
            return;
        }
        setGuardando(true);
        try {
            const values = form.getFieldsValue();
            const req = {
                nombre: values.nombre.trim(),
                sqlConsulta: values.sqlConsulta.trim(),
                sucursalIDs: values.sucursalIDs || undefined,
                columnaTitulo: values.columnaTitulo?.trim() || undefined,
                columnaMensaje: values.columnaMensaje?.trim() || undefined,
                tipo: values.tipo,
                activo: values.activo,
                intervaloMinutos: values.intervaloMinutos,
                destinos: (values.destinos || []).map((d) => ({
                    destinoTipo: d.destinoTipo,
                    destinoID: d.destinoID,
                })),
            };
            if (editando) {
                await notificacionesApi.actualizarSQLConfig(editando.id, req);
                message.success('Configuración actualizada correctamente');
            }
            else {
                await notificacionesApi.crearSQLConfig(req);
                message.success('Configuración creada correctamente');
            }
            onGuardado();
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
    return (_jsx(Modal, { title: editando ? 'Editar configuración SQL' : 'Nueva configuración SQL', open: visible, onCancel: onClose, onOk: handleGuardar, confirmLoading: guardando, okText: "Guardar", cancelText: "Cancelar", width: 800, footer: (_, { OkBtn, CancelBtn }) => (_jsxs(Space, { children: [_jsx(CancelBtn, {}), editando && (_jsx(Button, { icon: _jsx(PlayCircleOutlined, {}), onClick: handleProbar, loading: probando, children: "Probar SQL" })), _jsx(OkBtn, {})] })), children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Ej: Productos con stock bajo", maxLength: 200 }) }) }), _jsx(Col, { span: 6, children: _jsx(Form.Item, { name: "tipo", label: "Tipo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Select, { placeholder: "Seleccione tipo", options: TIPOS_OPCIONES }) }) }), _jsx(Col, { span: 6, children: _jsx(Form.Item, { name: "intervaloMinutos", label: "Intervalo (minutos)", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(InputNumber, { min: 1, style: { width: '100%' } }) }) })] }), _jsx(Form.Item, { label: "Sucursales destino", required: true, children: _jsx(Select, { mode: "multiple", placeholder: "\u00BFEn qu\u00E9 sucursal(es) ejecutar?", options: SUCURSALES_OPCIONES, value: sucursalesSeleccionadas, onChange: (values) => {
                            setSucursalesSeleccionadas(values);
                            form.setFieldValue('sucursalIDs', values.join(','));
                        } }) }), _jsx(Form.Item, { name: "sqlConsulta", label: "Consulta SQL", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input.TextArea, { placeholder: "SELECT id, nombre, stock FROM Productos WHERE stock <= 5", rows: 8, style: { fontFamily: 'Consolas, monospace', fontSize: 13 } }) }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "columnaTitulo", label: "Columna T\u00EDtulo", children: _jsx(Input, { placeholder: "Ej: nombre" }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "columnaMensaje", label: "Columna Mensaje", children: _jsx(Input, { placeholder: "Ej: stock" }) }) })] }), _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) }), _jsx(Form.List, { name: "destinos", children: (fields, { add, remove }) => (_jsxs("div", { style: { marginTop: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Destinatarios" }), _jsx(Button, { type: "dashed", size: "small", icon: _jsx(PlusOutlined, {}), onClick: () => add({ destinoTipo: 'Usuario', destinoID: undefined }), children: "Agregar destinatario" })] }), fields.length === 0 && (_jsx("div", { className: "paces-text-muted", style: { fontSize: 13, padding: '8px 0' }, children: "No hay destinatarios configurados" })), fields.map(({ key, name, ...restField }) => (_jsx(DestinoRow, { name: name, restField: restField, usuarios: usuarios, roles: roles, onRemove: () => remove(name), form: form }, key)))] })) })] }) }));
};
export default NotificacionSQLFormulario;
