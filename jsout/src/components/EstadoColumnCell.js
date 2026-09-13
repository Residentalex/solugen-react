import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Tag, Tooltip } from 'antd';
import { CheckCircleFilled, LockFilled } from '@ant-design/icons';
import { resolveEstado } from '../utils/estadoDocumento';
const LOCK_COLOR = {
    success: '#1b5e1b',
    error: '#9a0310',
    default: '#404040',
    processing: '#0035a0',
    warning: '#9e5c00',
    cyan: '#006666',
};
const EstadoColumnCell = ({ estado, periodo, revisado }) => {
    const esCerrado = typeof periodo === 'string' ? periodo === 'Cerrado' : Number(periodo) === 6;
    const info = resolveEstado(estado);
    const lockColor = LOCK_COLOR[info.color] || '#404040';
    return (_jsxs(Tag, { color: info.color, children: [info.label, revisado && (_jsx(Tooltip, { title: "Documento revisado", children: _jsx(CheckCircleFilled, { style: { marginLeft: 4, fontSize: 12, color: '#52c41a' } }) })), esCerrado && (_jsx(Tooltip, { title: "Per\u00EDodo contable cerrado", children: _jsx(LockFilled, { style: { marginLeft: 4, fontSize: 12, color: lockColor } }) }))] }));
};
export default EstadoColumnCell;
