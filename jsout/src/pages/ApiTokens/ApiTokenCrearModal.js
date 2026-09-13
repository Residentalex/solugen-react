import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Modal, Form, Input, Button, Typography, message, Alert } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { apiTokenApi } from '../../api/apiTokenApi';
const { Text } = Typography;
const ApiTokenCrearModal = ({ open, onClose, onCreated }) => {
    const usuario = useAuthStore((s) => s.usuario);
    const [form] = Form.useForm();
    const [modalState, setModalState] = useState('form');
    const [creating, setCreating] = useState(false);
    const [createdToken, setCreatedToken] = useState(null);
    const [copied, setCopied] = useState(false);
    const [closingConfirmed, setClosingConfirmed] = useState(false);
    const handleClose = useCallback(() => {
        if (modalState === 'created' && !copied && !closingConfirmed) {
            Modal.confirm({
                title: '¿Copiaste el token?',
                content: 'El token solo se muestra una vez. Si no lo copiaste, tendrás que generar uno nuevo.',
                okText: 'Sí, cerrar',
                cancelText: 'Cancelar',
                onOk: () => {
                    setClosingConfirmed(true);
                    setModalState('form');
                    setCreatedToken(null);
                    setCopied(false);
                    form.resetFields();
                    onClose();
                },
            });
            return;
        }
        setModalState('form');
        setCreatedToken(null);
        setCopied(false);
        setClosingConfirmed(false);
        form.resetFields();
        onClose();
    }, [modalState, copied, closingConfirmed, form, onClose]);
    const copiarAlPortapapeles = useCallback(async (texto) => {
        // Intentar con Clipboard API moderna
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            }
            catch {
                // fallback
            }
        }
        // Fallback: textarea oculto + execCommand
        try {
            const textarea = document.createElement('textarea');
            textarea.value = texto;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
        catch {
            return false;
        }
    }, []);
    const handleCopy = useCallback(async () => {
        if (!createdToken?.token)
            return;
        const exito = await copiarAlPortapapeles(createdToken.token);
        if (exito) {
            setCopied(true);
            message.success('Token copiado al portapapeles');
        }
        else {
            message.error('No se pudo copiar el token');
        }
    }, [createdToken, copiarAlPortapapeles]);
    const handleGenerate = useCallback(async () => {
        if (!usuario)
            return;
        try {
            const values = await form.validateFields();
            setCreating(true);
            const result = await apiTokenApi.crear({
                usuarioID: usuario.id,
                nombre: values.nombre,
            });
            setCreatedToken(result);
            setModalState('created');
            onCreated();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al generar token');
        }
        finally {
            setCreating(false);
        }
    }, [usuario, form, onCreated]);
    // Reset state when modal opens
    React.useEffect(() => {
        if (open) {
            setModalState('form');
            setCreatedToken(null);
            setCopied(false);
            setClosingConfirmed(false);
            form.resetFields();
        }
    }, [open, form]);
    return (_jsxs(Modal, { title: "Nuevo Token API", open: open, onCancel: handleClose, footer: null, width: 560, destroyOnHidden: true, closable: modalState !== 'created' || copied, mask: { closable: modalState !== 'created' }, children: [modalState === 'form' && (_jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "nombre", label: "Nombre del token", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Integraci\u00F3n POS", maxLength: 100 }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Button, { onClick: handleClose, children: "Cancelar" }), _jsx(Button, { type: "primary", loading: creating, onClick: handleGenerate, children: "Generar token" })] })] })), modalState === 'created' && createdToken && (_jsxs("div", { style: { marginTop: 16 }, children: [_jsx(Alert, { type: "warning", showIcon: true, message: "Guarda este token. No podr\u00E1s verlo de nuevo.", style: { marginBottom: 16 } }), _jsx("div", { style: { marginBottom: 8 }, children: _jsx(Text, { strong: true, children: "Token generado:" }) }), _jsx(Input.TextArea, { value: createdToken.token, readOnly: true, rows: 3, style: { fontFamily: 'monospace', fontSize: 13, marginBottom: 16 } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }, children: [_jsx(Button, { type: "primary", icon: copied ? _jsx(CheckOutlined, {}) : _jsx(CopyOutlined, {}), onClick: handleCopy, children: copied ? 'Copiado' : 'Copiar token' }), _jsx(Button, { onClick: handleClose, children: "Cerrar" })] })] }))] }));
};
export default ApiTokenCrearModal;
