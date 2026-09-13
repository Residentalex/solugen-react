import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Card, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { cuentaBancariaClienteApi } from '../../../api/cuentaBancariaClienteApi';
const CuentasBancariasTab = ({ codigoCliente, sucursal }) => {
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
            const res = await cuentaBancariaClienteApi.listar(sucursal, codigoCliente);
            setData(res ?? []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
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
        form.setFieldsValue({ inactiva: false, porDefecto: false });
        setModalVisible(true);
    };
    const handleEditar = (record) => {
        setEditRecord(record);
        form.setFieldsValue({
            codigo: record.codigo,
            nombre: record.nombre,
            codigoBanco: record.codigoBanco,
            cuentaBancaria: record.cuentaBancaria,
            tipoCuenta: record.tipoCuenta,
            codigoMoneda: record.codigoMoneda,
            inactiva: record.inactiva ?? false,
            porDefecto: record.porDefecto ?? false,
            numeroCuentaContable: record.numeroCuentaContable,
        });
        setModalVisible(true);
    };
    const handleEliminar = async (id) => {
        try {
            await cuentaBancariaClienteApi.eliminar(sucursal, codigoCliente, id);
            message.success('Cuenta bancaria eliminada correctamente');
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
                nombre: values.nombre || '',
                codigoBanco: values.codigoBanco || '',
                cuentaBancaria: values.cuentaBancaria || '',
                tipoCuenta: values.tipoCuenta || '',
                codigoMoneda: values.codigoMoneda || '',
                inactiva: values.inactiva ?? false,
                porDefecto: values.porDefecto ?? false,
                numeroCuentaContable: values.numeroCuentaContable || '',
            };
            if (editRecord?.id) {
                await cuentaBancariaClienteApi.actualizar(sucursal, codigoCliente, editRecord.id, payload);
                message.success('Cuenta bancaria actualizada correctamente');
            }
            else {
                await cuentaBancariaClienteApi.crear(sucursal, codigoCliente, payload);
                message.success('Cuenta bancaria creada correctamente');
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
        { title: 'Banco', dataIndex: 'codigoBanco', key: 'codigoBanco', width: 120 },
        { title: 'No. Cuenta', dataIndex: 'cuentaBancaria', key: 'cuentaBancaria', width: 160 },
        { title: 'Tipo', dataIndex: 'tipoCuenta', key: 'tipoCuenta', width: 100 },
        { title: 'Moneda', dataIndex: 'codigoMoneda', key: 'codigoMoneda', width: 100 },
        {
            title: 'Activo',
            dataIndex: 'inactiva',
            key: 'inactiva',
            width: 100,
            render: (val) => (_jsx(Tag, { color: val ? 'red' : 'green', children: val ? 'Inactiva' : 'Activa' })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Button, { type: "link", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => handleEditar(record) }), _jsx(Popconfirm, { title: "\u00C2\u00BFEliminar esta cuenta bancaria?", onConfirm: () => handleEliminar(record.id), okText: "S\u00C3\u00AD", cancelText: "No", children: _jsx(Button, { type: "link", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}) }) })] })),
        },
    ];
    return (_jsxs(Card, { className: "paces-card", styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregar, children: "Agregar" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar })] }) }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: data, columns: columns, rowKey: (r) => r.id || r.codigo || '', loading: loading, size: "middle", scroll: { x: 900 }, pagination: { showTotal: (t) => `${t} registros` } }), _jsx(Modal, { title: editRecord ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria', open: modalVisible, onOk: handleGuardar, onCancel: () => setModalVisible(false), confirmLoading: saving, destroyOnHidden: true, okText: "Guardar", cancelText: "Cancelar", width: 560, children: _jsxs(Form, { form: form, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "codigo", label: "C\u00C3\u00B3digo", children: _jsx(Input, { placeholder: "C\u00C3\u00B3digo", maxLength: 20 }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Nombre de la cuenta", maxLength: 100 }) }), _jsx(Form.Item, { name: "codigoBanco", label: "Banco", children: _jsx(Input, { placeholder: "C\u00C3\u00B3digo del banco", maxLength: 20 }) }), _jsx(Form.Item, { name: "cuentaBancaria", label: "No. Cuenta", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "N\u00C3\u00BAmero de cuenta", maxLength: 30 }) }), _jsx(Form.Item, { name: "tipoCuenta", label: "Tipo Cuenta", children: _jsx(Select, { placeholder: "Seleccione tipo", options: [
                                    { value: 'A', label: 'Ahorros' },
                                    { value: 'C', label: 'Corriente' },
                                ] }) }), _jsx(Form.Item, { name: "codigoMoneda", label: "Moneda", children: _jsx(Select, { placeholder: "Seleccione moneda", options: [
                                    { value: 'DOP', label: 'DOP - Peso Dominicano' },
                                    { value: 'USD', label: 'USD - DÃ³lar Americano' },
                                    { value: 'EUR', label: 'EUR - Euro' },
                                ] }) }), _jsx(Form.Item, { name: "numeroCuentaContable", label: "No. Cuenta Contable", children: _jsx(Input, { placeholder: "Cuenta contable", maxLength: 30 }) }), _jsxs(Space, { size: 24, children: [_jsx(Form.Item, { name: "inactiva", label: "Inactiva", valuePropName: "checked", style: { marginBottom: 0 }, children: _jsx(Switch, { checkedChildren: "S\u00C3\u00AD", unCheckedChildren: "No" }) }), _jsx(Form.Item, { name: "porDefecto", label: "Por Defecto", valuePropName: "checked", style: { marginBottom: 0 }, children: _jsx(Switch, { checkedChildren: "S\u00C3\u00AD", unCheckedChildren: "No" }) })] })] }) })] }));
};
export default CuentasBancariasTab;
