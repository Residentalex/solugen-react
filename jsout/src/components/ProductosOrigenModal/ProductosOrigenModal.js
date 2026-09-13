import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Input, Table, Button, Space } from 'antd';
const ProductosOrigenModal = ({ open, onClose, title = 'Agregar producto', sourceLabel = 'Origen', sourceProducts, comodines, addedCodes, sourceColumns, comodinColumns, onAddSourceProduct, onAddComodin, }) => {
    const [sourceSearch, setSourceSearch] = useState('');
    const [comodinSearch, setComodinSearch] = useState('');
    const [selectedSource, setSelectedSource] = useState([]);
    const [selectedComodin, setSelectedComodin] = useState([]);
    const sourceSearchRef = useRef(null);
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                sourceSearchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);
    useEffect(() => {
        if (open) {
            setSourceSearch('');
            setComodinSearch('');
            setSelectedSource([]);
            setSelectedComodin([]);
        }
    }, [open]);
    const filteredSource = sourceProducts
        .filter((p) => !addedCodes.includes(p.codigo))
        .filter((p) => {
        if (!sourceSearch)
            return true;
        const q = sourceSearch.toLowerCase();
        return (p.codigo || '').toLowerCase().includes(q) || (p.articulo || p.nombre || '').toLowerCase().includes(q);
    });
    const filteredComodines = comodines
        .filter((p) => !addedCodes.includes(p.codigo || p.idExterno))
        .filter((p) => {
        if (!comodinSearch)
            return true;
        const q = comodinSearch.toLowerCase();
        return (p.codigo || p.idExterno || '').toString().toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q);
    });
    return (_jsx(Modal, { title: title, open: open, onCancel: onClose, footer: null, width: 700, destroyOnHidden: true, children: _jsx(Tabs, { type: "card", items: [
                {
                    key: 'source',
                    label: `${sourceLabel} (${filteredSource.length})`,
                    children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { ref: sourceSearchRef, placeholder: "Buscar producto...", allowClear: true, style: { marginBottom: 16 }, onSearch: setSourceSearch, onChange: (e) => { if (!e.target.value)
                                    setSourceSearch(''); } }), _jsx(Table, { dataSource: filteredSource, columns: sourceColumns, rowKey: (r) => r.id || r.codigo, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, rowSelection: {
                                    type: 'checkbox',
                                    selectedRowKeys: selectedSource.map((r) => r.id || r.codigo),
                                    onChange: (_, rows) => setSelectedSource(rows),
                                }, onRow: (record) => ({
                                    onDoubleClick: () => { onAddSourceProduct(record); },
                                    style: { cursor: 'pointer' },
                                }) }), selectedSource.length > 0 && (_jsx("div", { style: { marginTop: 8, textAlign: 'right' }, children: _jsxs(Button, { type: "primary", size: "small", onClick: () => {
                                        selectedSource.forEach(onAddSourceProduct);
                                        setSelectedSource([]);
                                        onClose();
                                    }, children: ["Agregar seleccionados (", selectedSource.length, ")"] }) }))] })),
                },
                {
                    key: 'comodines',
                    label: `Comodines (${filteredComodines.length})`,
                    children: (_jsxs(_Fragment, { children: [_jsx(Input.Search, { placeholder: "Buscar comod\u00EDn...", allowClear: true, style: { marginBottom: 16 }, onSearch: setComodinSearch, onChange: (e) => { if (!e.target.value)
                                    setComodinSearch(''); } }), _jsx(Table, { dataSource: filteredComodines, columns: comodinColumns, rowKey: (r) => r.codigo || r.idExterno, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, rowSelection: {
                                    type: 'checkbox',
                                    selectedRowKeys: selectedComodin.map((r) => r.codigo || r.idExterno),
                                    onChange: (_, rows) => setSelectedComodin(rows),
                                }, onRow: (record) => ({
                                    onDoubleClick: () => { onAddComodin(record); },
                                    style: { cursor: 'pointer' },
                                }) }), selectedComodin.length > 0 && (_jsx("div", { style: { marginTop: 8, textAlign: 'right' }, children: _jsxs(Button, { type: "primary", size: "small", onClick: () => {
                                        selectedComodin.forEach(onAddComodin);
                                        setSelectedComodin([]);
                                        onClose();
                                    }, children: ["Agregar seleccionados (", selectedComodin.length, ")"] }) }))] })),
                },
            ] }) }));
};
export default ProductosOrigenModal;
