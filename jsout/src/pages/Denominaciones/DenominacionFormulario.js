import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { denominacionApi } from '../../api/denominacionApi';
import { useAuthStore } from '../../stores/authStore';
const DenominacionFormulario = ({ visible, editItem, onClose, onSaved, }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (visible) {
            if (editItem) {
                form.setFieldsValue(editItem);
            }
            else {
                form.resetFields();
                form.setFieldsValue({ activo: true, orden: 0 });
            }
        }
    }, [visible, editItem, form]);
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = {
                id: editItem?.id || 0,
                descripcion: values.descripcion,
                valor: values.valor,
                tipo: values.tipo,
                activo: values.activo,
                orden: values.orden,
            };
            if (editItem) {
                await denominacionApi.actualizar(sucursalActiva, payload);
                message.success('Denominación actualizada correctamente');
            }
            else {
                await denominacionApi.crear(sucursalActiva, payload);
                message.success('Denominación creada correctamente');
            }
            onSaved();
            onClose();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar denominación');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Modal, { title: editItem ? 'Editar Denominación' : 'Crear Denominación', open: visible, onCancel: onClose, onOk: handleOk, confirmLoading: saving, width: 520, okText: "Guardar", cancelText: "Cancelar", destroyOnClose: true, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "descripcion", label: "Descripci\u00F3n", rules: [{ required: true, message: 'La descripción es obligatoria' }], children: _jsx(Input, { placeholder: "Ej. Billete 2000", maxLength: 100 }) }), _jsx(Form.Item, { name: "valor", label: "Valor", rules: [{ required: true, message: 'El valor es obligatorio' }], children: _jsx(InputNumber, { min: 0.01, step: 0.01, precision: 2, style: { width: '100%' }, prefix: "$", placeholder: "0.00" }) }), _jsx(Form.Item, { name: "tipo", label: "Tipo", rules: [{ required: true, message: 'El tipo es obligatorio' }], children: _jsxs(Select, { placeholder: "Seleccione tipo", children: [_jsx(Select.Option, { value: "B", children: "Billete" }), _jsx(Select.Option, { value: "M", children: "Moneda" })] }) }), _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", children: _jsx(Switch, {}) }), _jsx(Form.Item, { name: "orden", label: "Orden", rules: [{ required: true, message: 'El orden es obligatorio' }], children: _jsx(InputNumber, { min: 0, style: { width: '100%' }, placeholder: "0" }) })] }) }));
};
export default DenominacionFormulario;
