import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import { useAuthStore } from '../../stores/authStore';
const ConfigPedidosYaFormulario = ({ visible, editItem, onClose, onSaved, }) => {
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
                form.setFieldsValue({ puerto: 22, margenBeneficio: 15 });
            }
        }
    }, [visible, editItem, form]);
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = {
                servidor: values.servidor,
                puerto: values.puerto,
                usuario: values.usuario,
                contrasena: values.contrasena || undefined,
                archivoClave: values.archivoClave || undefined,
                margenBeneficio: values.margenBeneficio,
                rutaRemota: values.rutaRemota || undefined,
                prefijoArchivo: values.prefijoArchivo || undefined,
                vendorID: values.vendorID || undefined,
            };
            await configPedidosYaApi.guardar(sucursalActiva, payload);
            message.success(editItem
                ? 'Configuración de PedidosYa actualizada correctamente'
                : 'Configuración de PedidosYa creada correctamente');
            onSaved();
            onClose();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración de PedidosYa');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Modal, { title: editItem ? 'Editar Configuración PedidosYa' : 'Crear Configuración PedidosYa', open: visible, onCancel: onClose, onOk: handleOk, confirmLoading: saving, width: 640, okText: "Guardar", cancelText: "Cancelar", destroyOnClose: true, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "servidor", label: "Servidor", rules: [{ required: true, message: 'El servidor es obligatorio' }], children: _jsx(Input, { placeholder: "vendor-automation-sftp-live-us.prod.aws.qcommerce.live" }) }), _jsx(Form.Item, { name: "puerto", label: "Puerto", rules: [{ required: true, message: 'El puerto es obligatorio' }], children: _jsx(InputNumber, { min: 1, max: 65535, style: { width: '100%' }, placeholder: "22" }) }), _jsx(Form.Item, { name: "usuario", label: "Usuario", rules: [{ required: true, message: 'El usuario es obligatorio' }], children: _jsx(Input, { placeholder: "usuario SFTP" }) }), _jsx(Form.Item, { name: "contrasena", label: "Contrase\u00F1a", children: _jsx(Input.Password, { placeholder: "Contrase\u00F1a SFTP (opcional)" }) }), _jsx(Form.Item, { name: "archivoClave", label: "Archivo Clave", children: _jsx(Input, { placeholder: "Ruta del archivo clave (opcional)" }) }), _jsx(Form.Item, { name: "margenBeneficio", label: "Margen Beneficio (%)", rules: [{ required: true, message: 'El margen de beneficio es obligatorio' }], children: _jsx(InputNumber, { min: 0, max: 100, step: 0.01, precision: 2, style: { width: '100%' }, placeholder: "15" }) }), _jsx(Form.Item, { name: "rutaRemota", label: "Ruta Remota", children: _jsx(Input, { placeholder: "Assortment/miChain_123.csv (opcional)" }) }), _jsx(Form.Item, { name: "prefijoArchivo", label: "Prefijo Archivo", children: _jsx(Input, { placeholder: "miChain (opcional)" }) }), _jsx(Form.Item, { name: "vendorID", label: "Vendor ID", children: _jsx(Input, { placeholder: "ID del vendedor (opcional)" }) })] }) }));
};
export default ConfigPedidosYaFormulario;
