import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, message, Card, Segmented } from 'antd';
import { WarningOutlined, InfoCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, } from '@ant-design/icons';
import { notificacionesApi } from '../../api/notificacionesApi';
import { useAuthStore } from '../../stores/authStore';
const tipoColor = {
    Alerta: '#f1b44c',
    Info: '#556ee6',
    Error: '#f46a6a',
    Advertencia: '#f1b44c',
    Exito: '#34c38f',
    Ticket: '#6f42c1',
};
const tipoIcono = {
    Alerta: WarningOutlined,
    Info: InfoCircleOutlined,
    Error: CloseCircleOutlined,
    Advertencia: ExclamationCircleOutlined,
    Exito: CheckCircleOutlined,
};
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const EnviarNotificacionModal = ({ visible, onClose, onEnviado }) => {
    const [form] = Form.useForm();
    const [usuarios, setUsuarios] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
    const sucursal = useAuthStore((s) => s.compania);
    const usuarioActual = useAuthStore((s) => s.usuario);
    useEffect(() => {
        if (visible) {
            form.resetFields();
            cargarUsuarios();
        }
    }, [visible]);
    const cargarUsuarios = async () => {
        setCargandoUsuarios(true);
        try {
            const data = await notificacionesApi.obtenerUsuarios();
            setUsuarios(data || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar usuarios');
        }
        finally {
            setCargandoUsuarios(false);
        }
    };
    const handleEnviar = async () => {
        try {
            const values = await form.validateFields();
            if (!usuarioActual?.id) {
                message.error('No se pudo identificar el usuario actual');
                return;
            }
            setGuardando(true);
            await notificacionesApi.enviar(sucursal, {
                deUsuarioID: usuarioActual.id,
                paraUsuariosID: values.paraUsuariosID,
                titulo: values.titulo,
                mensaje: values.mensaje,
                tipo: values.tipo || 'Info',
            });
            message.success('Notificación enviada correctamente');
            form.resetFields();
            onEnviado();
            onClose();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al enviar notificación');
        }
        finally {
            setGuardando(false);
        }
    };
    return (_jsx(Modal, { title: "Enviar Notificaci\u00F3n", open: visible, onCancel: onClose, onOk: handleEnviar, confirmLoading: guardando, okText: "Enviar", cancelText: "Cancelar", width: 640, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "tipo", label: "Tipo", initialValue: "Info", children: _jsx(Segmented, { options: [
                            { label: 'Info', value: 'Info' },
                            { label: '⚠ Alerta', value: 'Alerta' },
                            { label: '✕ Error', value: 'Error' },
                            { label: '✓ Éxito', value: 'Exito' },
                            { label: '🎫 Ticket', value: 'Ticket' },
                        ] }) }), _jsx(Form.Item, { name: "paraUsuariosID", label: "Destinatarios", rules: [{ required: true, message: 'Seleccione al menos un destinatario' }], children: _jsx(Select, { mode: "multiple", showSearch: true, placeholder: "Buscar destinatarios...", loading: cargandoUsuarios, filterOption: (input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase()), options: usuarios.map((u) => ({
                            value: u.id,
                            label: `${u.nombre} (${u.nombreUsuario})`,
                        })) }) }), _jsx(Form.Item, { name: "titulo", label: "T\u00EDtulo", rules: [{ required: true, message: 'El título es obligatorio' }], children: _jsx(Input, { placeholder: "T\u00EDtulo de la notificaci\u00F3n", maxLength: 200 }) }), _jsx(Form.Item, { name: "mensaje", label: "Mensaje", rules: [{ required: true, message: 'El mensaje es obligatorio' }], children: _jsx(Input.TextArea, { placeholder: "Escriba el mensaje...", rows: 4, maxLength: 500, showCount: true }) }), _jsx(Form.Item, { shouldUpdate: true, noStyle: true, children: () => {
                        const tipo = form.getFieldValue('tipo') || 'Info';
                        const titulo = form.getFieldValue('titulo');
                        const mensaje = form.getFieldValue('mensaje');
                        const IconComp = tipoIcono[tipo] || InfoCircleOutlined;
                        const color = tipoColor[tipo] || '#556ee6';
                        return (_jsx(Card, { size: "small", title: "Vista previa", style: { marginTop: 16, background: '#fafafa' }, children: _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'flex-start' }, children: [_jsx("div", { style: {
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: hexToRgba(color, 0.12),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }, children: _jsx(IconComp, { style: { fontSize: 16, color } }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: titulo || 'Título de la notificación' }), _jsx("div", { style: { fontSize: 12, color: '#6c757d', marginTop: 2 }, children: mensaje || 'Mensaje de la notificación' }), _jsxs("div", { style: { fontSize: 11, color: '#6c757d', marginTop: 4 }, children: [_jsx(ClockCircleOutlined, { style: { marginRight: 4, fontSize: 10 } }), "Ahora \u00B7 ", tipo] })] })] }) }));
                    } })] }) }));
};
export default EnviarNotificacionModal;
