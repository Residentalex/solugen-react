import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Space, Button, Tag } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { ESTADO_DOCUMENTO_MAP } from '../utils/estadoDocumento';
import PermissionGate from './PermissionGate';
const FormularioToolbar = ({ saving, estado, periodo, mode = 'crear', onGuardar, onCancelar, children, }) => {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [children, _jsx("div", { style: { flex: 1 } }), _jsxs(Space, { wrap: true, children: [_jsx(PermissionGate, { accion: mode === 'editar' ? 'EDITAR' : 'CREAR', children: _jsx(Button, { type: "primary", icon: _jsx(SaveOutlined, {}), loading: saving, onClick: onGuardar, children: "Guardar" }) }), _jsx(Button, { icon: _jsx(CloseOutlined, {}), onClick: onCancelar, children: "Cancelar" })] })] }));
};
export function EstadoTag({ estado, periodo }) {
    const esCerrado = periodo === 6;
    const estadoInfo = estado !== undefined ? ESTADO_DOCUMENTO_MAP[estado] : undefined;
    if (estado === undefined)
        return null;
    return (_jsxs(Space, { children: [esCerrado && _jsx(Tag, { color: "geekblue", children: "Cerrado" }), estadoInfo && _jsx(Tag, { color: estadoInfo.color, children: estadoInfo.label })] }));
}
export default FormularioToolbar;
