import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Card, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { grupoProductoClienteApi } from '../../../api/grupoProductoClienteApi';
const GruposProductosTab = ({ codigoCliente, sucursal }) => {
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
            const res = await grupoProductoClienteApi.listar(sucursal, codigoCliente);
            setData(res ?? []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos de productos');
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
        setModalVisible(true);
    };
    const handleEditar = (record) => {
        setEditRecord(record);
        form.setFieldsValue({
            codigoGrupo: record.codigoGrupo,
            nombreGrupo: record.nombreGrupo,
            porcentajeDescuento: record.porcentajeDescuento,
        });
        setModalVisible(true);
    };
    const handleEliminar = async (id) => {
        try {
            await grupoProductoClienteApi.eliminar(sucursal, codigoCliente, id);
            message.success('Grupo de producto eliminado correctamente');
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
                codigoGrupo: values.codigoGrupo || '',
                nombreGrupo: values.nombreGrupo || '',
                porcentajeDescuento: values.porcentajeDescuento ?? 0,
            };
            if (editRecord?.id) {
                await grupoProductoClienteApi.actualizar(sucursal, codigoCliente, editRecord.id, payload);
                message.success('Grupo de producto actualizado correctamente');
            }
            else {
                await grupoProductoClienteApi.crear(sucursal, codigoCliente, payload);
                message.success('Grupo de producto creado correctamente');
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
        { title: 'CÃ³digo Grupo', dataIndex: 'codigoGrupo', key: 'codigoGrupo', width: 140 },
        { title: 'Nombre Grupo', dataIndex: 'nombreGrupo', key: 'nombreGrupo', ellipsis: true },
        {
            title: '% Descuento',
            dataIndex: 'porcentajeDescuento',
            key: 'porcentajeDescuento',
            width: 130,
            render: (val) => (val != null ? `${Number(val).toFixed(2)}%` : '-'),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Button, { type: "link", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => handleEditar(record) }), _jsx(Popconfirm, { title: "\u00C2\u00BFEliminar este grupo de producto?", onConfirm: () => handleEliminar(record.id), okText: "S\u00C3\u00AD", cancelText: "No", children: _jsx(Button, { type: "link", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}) }) })] })),
        },
    ];
    return (_jsxs(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregar, children: "Agregar" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: data, columns: columns, rowKey: (r) => r.id || r.codigoGrupo || '', loading: loading, size: "middle", scroll: { x: 600 }, pagination: { showTotal: (t) => `${t} registros` } }), _jsx(Modal, { title: editRecord ? 'Editar Grupo de Producto' : 'Nuevo Grupo de Producto', open: modalVisible, onOk: handleGuardar, onCancel: () => setModalVisible(false), confirmLoading: saving, destroyOnHidden: true, okText: "Guardar", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "codigoGrupo", label: "C\u00C3\u00B3digo Grupo", children: _jsx(Input, { placeholder: "C\u00C3\u00B3digo del grupo", maxLength: 20 }) }), _jsx(Form.Item, { name: "nombreGrupo", label: "Nombre Grupo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre del grupo", maxLength: 100 }) }), _jsx(Form.Item, { name: "porcentajeDescuento", label: "% Descuento", children: _jsx(InputNumber, { min: 0, max: 100, step: 0.01, style: { width: '100%' } }) })] }) })] }));
};
export default GruposProductosTab;
