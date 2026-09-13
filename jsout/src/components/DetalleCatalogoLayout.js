import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Alert } from 'antd';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, DeleteOutlined, StopOutlined, } from '@ant-design/icons';
import PermissionGate from './PermissionGate';
import ErrorDetalle from './ErrorDetalle';
const DetalleCatalogoLayout = ({ rutaVolver, loading, mensajeLoading = 'Cargando...', loadingError, mensajeError = 'Error al cargar el documento', onRecargar, errorSinDatos = true, dataDisponible, modo = 'editar', onEditar, onGuardar, onEliminar, onInactivar, guardando = false, eliminando = false, extraLeft, extraActions, onVolver, children, }) => {
    const navigate = useNavigate();
    // Estado LOADING inicial (sin datos previos)
    if (loading && !dataDisponible) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: mensajeLoading })] }));
    }
    // Estado ERROR inicial (sin datos)
    if (loadingError && !dataDisponible) {
        if (errorSinDatos) {
            return (_jsx(ErrorDetalle, { mensaje: mensajeError, rutaVolver: rutaVolver, onRecargar: onRecargar }));
        }
        return (_jsx(Alert, { message: mensajeError, type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: onRecargar, children: "Reintentar" }) }));
    }
    // Sin datos (ni loading, ni error, ni data)
    if (!dataDisponible) {
        return null;
    }
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: mensajeError, type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: onRecargar, children: "Reintentar" }) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: onVolver ?? (() => navigate(rutaVolver)), children: "Volver" }), extraLeft, _jsx("div", { style: { flex: 1 } }), extraActions, onEditar && (_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), onClick: onEditar, children: "Editar" }) })), onGuardar && (_jsx(PermissionGate, { accion: modo === 'crear' ? 'CREAR' : 'EDITAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: guardando, onClick: onGuardar, children: "Guardar" }) })), onEliminar && (_jsx(PermissionGate, { accion: "ELIMINAR", children: _jsx(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), loading: eliminando, onClick: onEliminar, children: "Eliminar" }) })), onInactivar && (_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { icon: _jsx(StopOutlined, {}), onClick: onInactivar, children: "Inactivar" }) }))] }), children] }));
};
export default DetalleCatalogoLayout;
