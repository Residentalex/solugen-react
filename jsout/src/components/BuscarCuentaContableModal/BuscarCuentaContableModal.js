import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, message, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { cuentaContableApi } from '../../api/cuentaContableApi';
const BuscarCuentaContableModal = ({ open, onClose, onSelect, sucursal, buscar, multiple = false, onSeleccionarMultiples, }) => {
    const [cuentas, setCuentas] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [seleccionadas, setSeleccionadas] = useState([]);
    const searchRef = useRef(null);
    // Ref para estabilizar `buscar` en el useEffect de limpieza: evita que
    // el efecto se re-ejecute en cada render del padre cuando `buscar` es inline.
    const buscarRef = useRef(buscar);
    useEffect(() => {
        buscarRef.current = buscar;
    }, [buscar]);
    useEffect(() => {
        if (!open)
            return;
        setSearchText('');
        setSeleccionadas([]);
        if (buscarRef.current) {
            setCuentas([]);
            return;
        }
        cuentaContableApi
            .obtenerAuxiliares(sucursal)
            .then((res) => setCuentas(res || []))
            .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables'));
    }, [open, sucursal]);
    const cuentasFiltradas = useMemo(() => {
        if (!searchText)
            return cuentas;
        const q = searchText.toLowerCase();
        return cuentas.filter((c) => (c.noCuenta || '').toLowerCase().includes(q) ||
            (c.nombre || '').toLowerCase().includes(q));
    }, [cuentas, searchText]);
    const handleBuscarServidor = async (val) => {
        const trimmed = (val || '').trim();
        setSearchText(trimmed);
        if (!trimmed) {
            setCuentas([]);
            return;
        }
        try {
            if (!buscar)
                return;
            const result = await buscar(trimmed);
            setCuentas(result || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al buscar cuentas contables');
            setCuentas([]);
        }
    };
    const toggleSeleccion = (cuenta) => {
        setSeleccionadas((prev) => {
            const existe = prev.some((c) => c.noCuenta === cuenta.noCuenta);
            return existe ? prev.filter((c) => c.noCuenta !== cuenta.noCuenta) : [...prev, cuenta];
        });
    };
    const handleAceptar = () => {
        if (seleccionadas.length === 0)
            return;
        onSeleccionarMultiples?.(seleccionadas);
        onClose();
    };
    const columnas = [
        {
            title: 'No. Cuenta',
            dataIndex: 'noCuenta',
            key: 'noCuenta',
            width: 140,
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            ellipsis: true,
        },
    ];
    const dataSource = buscar ? cuentas : cuentasFiltradas;
    const rowSelection = multiple
        ? {
            selectedRowKeys: seleccionadas.map((c) => c.noCuenta),
            onChange: (_keys, rows) => setSeleccionadas(rows),
        }
        : undefined;
    return (_jsxs(Modal, { title: "Buscar Cuenta Contable", open: open, onCancel: onClose, footer: multiple
            ? () => (_jsx("div", { style: { textAlign: 'right' }, children: _jsx(Button, { type: "primary", disabled: seleccionadas.length === 0, onClick: handleAceptar, children: "Aceptar" }) }))
            : null, width: 700, destroyOnClose: true, children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar por No. Cuenta o Nombre...", allowClear: true, onSearch: (val) => {
                    if (buscar) {
                        handleBuscarServidor(val);
                    }
                    else {
                        setSearchText(val || '');
                    }
                }, onChange: (e) => {
                    if (buscar) {
                        if (!e.target.value) {
                            setSearchText('');
                            setCuentas([]);
                        }
                    }
                    else {
                        setSearchText(e.target.value || '');
                    }
                }, style: { marginBottom: 16 } }), _jsx(Table, { dataSource: dataSource, columns: columnas, rowKey: "noCuenta", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, scroll: { y: 400 }, rowSelection: rowSelection, onRow: (record) => ({
                    onClick: () => {
                        if (multiple) {
                            toggleSeleccion(record);
                        }
                        else {
                            onSelect(record);
                            onClose();
                        }
                    },
                    style: { cursor: 'pointer' },
                }), locale: {
                    emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: buscar
                                ? (searchText ? 'Sin resultados' : 'Escriba para buscar cuentas')
                                : 'No hay cuentas contables' }) })),
                } })] }));
};
export default BuscarCuentaContableModal;
