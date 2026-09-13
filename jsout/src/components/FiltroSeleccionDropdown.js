import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Input, Checkbox, Button } from 'antd';
const FiltroSeleccionDropdown = ({ dataSource, dataIndex, render, placeholder = 'Buscar...', filtroKey, filtrosActivos, setFiltrosActivos, confirm, clearFilters, }) => {
    const [searchText, setSearchText] = useState('');
    const activos = filtrosActivos[filtroKey];
    const [selectedValues, setSelectedValues] = useState(Array.isArray(activos?.valor) ? activos.valor : []);
    // Extraer valores únicos del dataSource
    const valoresUnicos = useMemo(() => {
        const set = new Set();
        dataSource.forEach((item) => {
            const val = render ? render(item) : item?.[dataIndex];
            if (val != null && val !== '') {
                set.add(String(val));
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
    }, [dataSource, dataIndex, render]);
    // Filtrar opciones según el texto de búsqueda
    const opcionesFiltradas = useMemo(() => {
        if (!searchText)
            return valoresUnicos;
        const q = searchText.toLowerCase();
        return valoresUnicos.filter(v => v.toLowerCase().includes(q));
    }, [valoresUnicos, searchText]);
    const handleCheck = (valor, checked) => {
        setSelectedValues(prev => checked ? [...prev, valor] : prev.filter(v => v !== valor));
    };
    const handleAceptar = () => {
        setFiltrosActivos((prev) => {
            const next = { ...prev };
            if (selectedValues.length > 0) {
                next[filtroKey] = { valor: selectedValues };
            }
            else {
                delete next[filtroKey];
            }
            return next;
        });
        confirm();
    };
    const handleLimpiar = () => {
        setSelectedValues([]);
        setSearchText('');
        clearFilters?.();
        setFiltrosActivos((prev) => {
            const next = { ...prev };
            delete next[filtroKey];
            return next;
        });
        confirm();
    };
    const isChecked = (valor) => selectedValues.includes(valor);
    return (_jsxs("div", { style: { padding: 8, width: 280 }, children: [_jsx(Input.Search, { placeholder: placeholder, value: searchText, onChange: e => setSearchText(e.target.value), style: { marginBottom: 8 }, allowClear: true, onClear: () => setSearchText('') }), _jsxs("div", { style: { maxHeight: 200, overflowY: 'auto', marginBottom: 8 }, children: [opcionesFiltradas.map(valor => (_jsx("div", { style: { padding: '2px 0' }, children: _jsx(Checkbox, { checked: isChecked(valor), onChange: e => handleCheck(valor, e.target.checked), children: _jsx("span", { style: { fontSize: 13 }, children: valor }) }) }, valor))), opcionesFiltradas.length === 0 && (_jsx("div", { style: { padding: '8px 0', textAlign: 'center' }, className: "paces-text-secondary", children: "Sin opciones" }))] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: 8 }, children: [_jsx(Button, { size: "small", onClick: handleLimpiar, children: "Limpiar" }), _jsx(Button, { type: "primary", size: "small", onClick: handleAceptar, children: "Aceptar" })] })] }));
};
export default FiltroSeleccionDropdown;
