import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Tag, Card, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { personaAutorizadaApi } from '../../../api/personaAutorizadaApi';
const PersonasAutorizadasTab = ({ codigoCliente, sucursal }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const cargar = useCallback(async () => {
        if (!codigoCliente)
            return;
        setLoading(true);
        try {
            const res = await personaAutorizadaApi.listar(sucursal, codigoCliente);
            setData(res ?? []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar personas autorizadas');
        }
        finally {
            setLoading(false);
        }
    }, [sucursal, codigoCliente]);
    useEffect(() => {
        cargar();
    }, [cargar]);
    const handleAgregar = () => {
        setEditRecord(null);
        form.resetFields();
        form.setFieldsValue({ creditoFiscal: false });
        setModalVisible(true);
    };
    const handleEditar = (record) => {
        setEditRecord(record);
        form.setFieldsValue({
            codigo: record.codigo,
            nombre: record.nombre,
            cedula: record.cedula,
            telefono: record.telefono,
            fax: record.fax,
            email: record.email,
            direccion: record.direccion,
            noContrato: record.noContrato,
            creditoFiscal: record.creditoFiscal ?? false,
        });
        setModalVisible(true);
    };
    const handleEliminar = async (id) => {
        try {
            await personaAutorizadaApi.eliminar(sucursal, codigoCliente, id);
            message.success('Persona autorizada eliminada correctamente');
            cargar();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
    };
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = {
                codigo: values.codigo || '',
                nombre: values.nombre,
                cedula: values.cedula || '',
                telefono: values.telefono || '',
                fax: values.fax || '',
                email: values.email || '',
                direccion: values.direccion || '',
                noContrato: values.noContrato || '',
                creditoFiscal: values.creditoFiscal ?? false,
            };
            if (editRecord?.id) {
                await personaAutorizadaApi.actualizar(sucursal, codigoCliente, editRecord.id, payload);
                message.success('Persona autorizada actualizada correctamente');
            }
            else {
                await personaAutorizadaApi.crear(sucursal, codigoCliente, payload);
                message.success('Persona autorizada creada correctamente');
            }
            setModalVisible(false);
            cargar();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar');
        }
        finally {
            setSaving(false);
        }
    };
    const columns = [
        { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 100 },
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
        { title: 'CÃ©dula', dataIndex: 'cedula', key: 'cedula', width: 140 },
        { title: 'TelÃ©fono', dataIndex: 'telefono', key: 'telefono', width: 130 },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
        {
            title: 'Cred. Fiscal',
            dataIndex: 'creditoFiscal',
            key: 'creditoFiscal',
            width: 120,
            render: (val) => (_jsx(Tag, { color: val ? 'green' : 'default', children: val ? 'SÃ­' : 'No' })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Button, { type: "link", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => handleEditar(record) }), _jsx(Popconfirm, { title: "\u00C2\u00BFEliminar esta persona autorizada?", onConfirm: () => handleEliminar(record.id), okText: "S\u00C3\u00AD", cancelText: "No", children: _jsx(Button, { type: "link", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}) }) })] })),
        },
    ];
    return (_jsxs(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregar, children: "Agregar" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: data, columns: columns, rowKey: (r) => r.id || r.codigo || '', loading: loading, size: "middle", scroll: { x: 800 }, pagination: { showTotal: (t) => `${t} registros` } }), _jsx(Modal, { title: editRecord ? 'Editar Persona Autorizada' : 'Nueva Persona Autorizada', open: modalVisible, onOk: handleGuardar, onCancel: () => setModalVisible(false), confirmLoading: saving, destroyOnHidden: true, okText: "Guardar", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "codigo", label: "C\u00C3\u00B3digo", children: _jsx(Input, { placeholder: "C\u00C3\u00B3digo", maxLength: 20 }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre completo", maxLength: 100 }) }), _jsx(Form.Item, { name: "cedula", label: "C\u00C3\u00A9dula", children: _jsx(Input, { placeholder: "C\u00C3\u00A9dula", maxLength: 20 }) }), _jsx(Form.Item, { name: "telefono", label: "Tel\u00C3\u00A9fono", children: _jsx(Input, { placeholder: "Tel\u00C3\u00A9fono", maxLength: 20 }) }), _jsx(Form.Item, { name: "fax", label: "Fax", children: _jsx(Input, { placeholder: "Fax", maxLength: 20 }) }), _jsx(Form.Item, { name: "email", label: "Email", children: _jsx(Input, { placeholder: "correo@ejemplo.com", maxLength: 80 }) }), _jsx(Form.Item, { name: "direccion", label: "Direcci\u00C3\u00B3n", children: _jsx(Input.TextArea, { placeholder: "Direcci\u00C3\u00B3n", rows: 2, maxLength: 200 }) }), _jsx(Form.Item, { name: "noContrato", label: "No. Contrato", children: _jsx(Input, { placeholder: "N\u00C3\u00BAmero de contrato", maxLength: 50 }) }), _jsx(Form.Item, { name: "creditoFiscal", label: "Cr\u00C3\u00A9dito Fiscal", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00C3\u00AD", unCheckedChildren: "No" }) })] }) })] }));
};
export default PersonasAutorizadasTab;
