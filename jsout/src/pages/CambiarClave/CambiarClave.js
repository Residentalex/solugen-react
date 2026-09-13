import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/authApi';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { LockOutlined, WarningOutlined } from '@ant-design/icons';
import GenesisLogo from '../../components/GenesisLogo';
const { Text } = Typography;
const CambiarClave = () => {
    const [claveActual, setClaveActual] = useState('');
    const [claveNueva, setClaveNueva] = useState('');
    const [confirmarClave, setConfirmarClave] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const usuario = useAuthStore((s) => s.usuario);
    const marcarClaveCambiada = useAuthStore((s) => s.marcarClaveCambiada);
    const navigate = useNavigate();
    const handleSubmit = async () => {
        setError('');
        if (!claveActual || !claveNueva || !confirmarClave) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (claveNueva.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (claveNueva !== confirmarClave) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }
        if (claveActual === claveNueva) {
            setError('La nueva contraseña no puede ser igual a la actual.');
            return;
        }
        setLoading(true);
        try {
            await authApi.cambiarClave({
                usuarioID: usuario.id,
                claveActual,
                claveNueva,
            });
            marcarClaveCambiada();
            navigate('/', { replace: true });
        }
        catch (err) {
            const apiMsg = err.response?.data?.errorMessage || err.response?.data?.ErrorMessage;
            setError(apiMsg || 'Error al cambiar la contraseña.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }, children: _jsxs(Card, { style: { width: 420, padding: '24px 0' }, children: [_jsx("div", { style: { textAlign: 'center', marginBottom: 8 }, children: _jsx(GenesisLogo, { size: 40, color: "#1890ff" }) }), _jsxs("div", { style: { textAlign: 'center', marginBottom: 20, padding: '0 24px' }, children: [_jsx(WarningOutlined, { style: { fontSize: 32, color: '#faad14', marginBottom: 8 } }), _jsx("br", {}), _jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Debes cambiar tu contrase\u00F1a" }), _jsx("br", {}), _jsx(Text, { type: "secondary", children: "Por seguridad, debes establecer una nueva contrase\u00F1a para continuar." })] }), _jsxs(Form, { layout: "vertical", style: { padding: '0 24px' }, onFinish: handleSubmit, children: [error && (_jsx(Alert, { message: error, type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsx(Form.Item, { label: "Contrase\u00F1a actual", children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, {}), value: claveActual, onChange: (e) => setClaveActual(e.target.value), placeholder: "Contrase\u00F1a actual", autoFocus: true }) }), _jsx(Form.Item, { label: "Nueva contrase\u00F1a", children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, {}), value: claveNueva, onChange: (e) => setClaveNueva(e.target.value), placeholder: "Nueva contrase\u00F1a" }) }), _jsx(Form.Item, { label: "Confirmar nueva contrase\u00F1a", children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, {}), value: confirmarClave, onChange: (e) => setConfirmarClave(e.target.value), placeholder: "Confirmar nueva contrase\u00F1a" }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: loading, style: { width: '100%' }, children: "Cambiar Contrase\u00F1a" }) }), _jsx("div", { style: { textAlign: 'center' }, children: _jsx(Button, { type: "link", onClick: () => { useAuthStore.getState().logout(); navigate('/login'); }, children: "Cerrar sesi\u00F3n" }) })] })] }) }));
};
export default CambiarClave;
