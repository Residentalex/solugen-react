import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, CopyOutlined, PrinterOutlined } from '@ant-design/icons';
import FiltrosDocumento from './FiltrosDocumento/FiltrosDocumento';
import PageSizeSelect from './PageSizeSelect';
import PermissionGate from './PermissionGate';
const { Search } = Input;
const DocumentListadoToolbar = ({ showFiltros, filtros, rangoDefault, opcionesEstado, onFiltrosAplicar, searchPlaceholder = 'Buscar...', searchDefaultValue, onSearch, pageSize, onPageSizeChange, showCrear, onCrear, showEditar, editarDisabled, onEditar, showClonar, clonarDisabled, onClonar, showImprimir, imprimirDisabled, onImprimir, ocultarSearch, onRefresh, extraLeft, extraRight, }) => {
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 16,
            flexWrap: 'wrap',
        }, children: [extraLeft, showFiltros && filtros && onFiltrosAplicar && (_jsx(FiltrosDocumento, { filtros: filtros, onAplicar: onFiltrosAplicar, opcionesEstado: opcionesEstado || [], rangoDefault: rangoDefault })), !ocultarSearch && _jsx(Search, { placeholder: searchPlaceholder, allowClear: true, defaultValue: searchDefaultValue, onSearch: onSearch, onKeyDown: (e) => {
                    if (e.key === 'Escape') {
                        e.target.blur();
                        onSearch('');
                    }
                }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(PageSizeSelect, { value: pageSize, onChange: onPageSizeChange }), _jsx("div", { style: { flex: 1 } }), showCrear && onCrear && (_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: onCrear, children: "Nuevo" }) })), showEditar && onEditar && (_jsx(PermissionGate, { accion: "EDITAR", children: _jsx(Button, { icon: _jsx(EditOutlined, {}), disabled: editarDisabled, onClick: onEditar, children: "Editar" }) })), showClonar && onClonar && (_jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { icon: _jsx(CopyOutlined, {}), disabled: clonarDisabled, onClick: onClonar }) })), showImprimir && onImprimir && (_jsx(PermissionGate, { accion: "IMPRIMIR", children: _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: onImprimir, disabled: imprimirDisabled }) })), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onRefresh }), extraRight] }));
};
export default DocumentListadoToolbar;
