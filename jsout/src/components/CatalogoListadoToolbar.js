import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import PageSizeSelect from './PageSizeSelect';
import PermissionGate from './PermissionGate';
const { Search } = Input;
const CatalogoListadoToolbar = ({ onSearch, placeholder = 'Buscar...', pageSize, onPageSizeChange, ocultarPageSize = false, filtros, onNuevo, acciones, onReload, onExportarExcel, }) => {
    return (_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Search, { placeholder: placeholder, allowClear: true, onSearch: onSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), filtros, !ocultarPageSize && _jsx(PageSizeSelect, { value: pageSize, onChange: onPageSizeChange }), _jsx("div", { style: { flex: 1 } }), onNuevo && (_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: onNuevo, children: "Nuevo" }) })), acciones, onExportarExcel && (_jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: onExportarExcel }) })), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onReload })] }) }));
};
export default CatalogoListadoToolbar;
