import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Button, Space } from 'antd';
import { CloseCircleOutlined, ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
const ErrorDetalle = ({ mensaje = 'Error al cargar el documento', rutaVolver = '/', onRecargar, }) => {
    const navigate = useNavigate();
    return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(CloseCircleOutlined, { style: { fontSize: 48, color: '#ff4d4f' } }), _jsx("div", { style: { marginTop: 16, fontSize: 16, color: '#ff4d4f' }, children: mensaje }), _jsx("div", { style: { marginTop: 8 }, className: "paces-text-secondary", children: "Verifique que el documento exista en la sucursal seleccionada." }), _jsxs(Space, { style: { marginTop: 24 }, children: [_jsx(Button, { type: "primary", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(rutaVolver), children: "Volver al listado" }), onRecargar && (_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onRecargar }))] })] }));
};
export default ErrorDetalle;
