import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, Spin, message } from 'antd';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import { toTitleCase } from '../../utils/formats';
const BuscarCuentaBancariaModal = ({ open, onClose, onSelect, sucursal, }) => {
    const [cuentas, setCuentas] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(null);
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        setSearchText('');
        setLoading(true);
        cuentaBancariaApi.obtenerListado(sucursal)
            .then((res) => setCuentas(res || []))
            .catch(() => message.error('Error al cargar cuentas bancarias'))
            .finally(() => setLoading(false));
    }, [open, sucursal]);
    const cuentasFiltradas = useMemo(() => {
        if (!searchText)
            return cuentas;
        const q = searchText.toLowerCase();
        return cuentas.filter((c) => (c.noCuenta || '').toLowerCase().includes(q) ||
            (c.banco || '').toLowerCase().includes(q) ||
            (c.nombre || '').toLowerCase().includes(q));
    }, [cuentas, searchText]);
    const columnas = [
        {
            title: 'Banco',
            key: 'banco',
            width: 200,
            render: (_, r) => (_jsx("span", { children: _jsx("strong", { children: toTitleCase(r.banco || '') }) })),
        },
        {
            title: 'No. Cuenta',
            dataIndex: 'noCuenta',
            key: 'noCuenta',
            width: 200,
        },
    ];
    return (_jsx(Modal, { title: "Buscar Cuenta Bancaria", open: open, onCancel: onClose, footer: null, width: 750, destroyOnHidden: true, children: _jsxs(Spin, { spinning: loading, tip: "Cargando cuentas bancarias...", children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar por banco, n\u00FAmero de cuenta o nombre...", allowClear: true, onSearch: (val) => setSearchText(val || ''), onChange: (e) => {
                        if (!e.target.value)
                            setSearchText('');
                    }, style: { marginBottom: 16 } }), _jsx(Table, { dataSource: cuentasFiltradas, columns: columnas, rowKey: "noCuenta", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                        onClick: () => {
                            onSelect(record);
                            onClose();
                        },
                        style: { cursor: 'pointer' },
                    }), locale: {
                        emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay cuentas bancarias" }) })),
                    }, scroll: { x: 650 } })] }) }));
};
export default BuscarCuentaBancariaModal;
