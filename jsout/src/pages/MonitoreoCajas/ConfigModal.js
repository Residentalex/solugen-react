import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Space, message } from 'antd';
import { monitoreoApi } from '../../api/monitoreoApi';
const ConfigModal = ({ caja, open, onClose }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    useEffect(() => {
        if (open && caja) {
            form.setFieldsValue({
                ip: caja.ip,
                noCaja: caja.noCaja,
                version: caja.version,
                delayTime: parseInt(caja.delayTime, 10) || 0,
                serverConnection: caja.connectionStrings.serverConnection,
                clientConnection: caja.connectionStrings.clientConnection,
                rncConnection: caja.connectionStrings.rncConnection,
                rncClienteConnection: caja.connectionStrings.rncClienteConnection,
            });
        }
    }, [open, caja, form]);
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            if (!caja)
                return;
            setLoading(true);
            const config = {
                noCaja: values.noCaja,
                version: values.version,
                delayTime: String(values.delayTime),
                connectionStrings: {
                    serverConnection: values.serverConnection,
                    clientConnection: values.clientConnection,
                    rncConnection: values.rncConnection,
                    rncClienteConnection: values.rncClienteConnection,
                },
            };
            await monitoreoApi.configurar(caja.ip, config);
            message.success('Configuración guardada correctamente');
            onClose();
        }
        catch (err) {
            if (err?.errorFields)
                return; // Error de validación del form
            message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Modal, { title: `Configurar - ${caja?.nombre || ''}`, open: open, onCancel: onClose, width: 600, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "primary", loading: loading, onClick: handleGuardar, children: "Guardar" })] }), children: _jsxs(Form, { form: form, layout: "vertical", size: "small", style: { marginTop: 16 }, children: [_jsx(Form.Item, { label: "IP", name: "ip", children: _jsx(Input, { disabled: true }) }), _jsx(Form.Item, { label: "No. Caja", name: "noCaja", rules: [{ required: true, message: 'Ingrese el número de caja' }], children: _jsx(Input, {}) }), _jsx(Form.Item, { label: "Versi\u00F3n", name: "version", rules: [{ required: true, message: 'Ingrese la versión' }], children: _jsx(Input, {}) }), _jsx(Form.Item, { label: "DelayTime", name: "delayTime", rules: [{ required: true, message: 'Ingrese el delay time' }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0 }) }), _jsx(Form.Item, { label: "ServerConnection", name: "serverConnection", rules: [{ required: true, message: 'Ingrese la conexión del servidor' }], children: _jsx(Input.TextArea, { rows: 2 }) }), _jsx(Form.Item, { label: "ClientConnection", name: "clientConnection", rules: [{ required: true, message: 'Ingrese la conexión del cliente' }], children: _jsx(Input.TextArea, { rows: 2 }) }), _jsx(Form.Item, { label: "RNCConnection", name: "rncConnection", rules: [{ required: true, message: 'Ingrese la conexión RNC' }], children: _jsx(Input.TextArea, { rows: 2 }) }), _jsx(Form.Item, { label: "RNCClienteConnection", name: "rncClienteConnection", rules: [{ required: true, message: 'Ingrese la conexión RNC Cliente' }], children: _jsx(Input.TextArea, { rows: 2 }) })] }) }));
};
export default ConfigModal;
