import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Input, Table, Button, Typography, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { empleadoApi } from '../../api/empleadoApi';
import { toTitleCase } from '../../utils/formats';
const { Text } = Typography;
const BuscarEmpleadoModal = ({ open, onClose, onSelect }) => {
    const sucursal = useAuthStore((s) => s.compania);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const searchRef = useRef(null);
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);
    const cargar = useCallback(async (busqueda) => {
        if (!sucursal)
            return;
        setLoading(true);
        try {
            const result = await empleadoApi.obtenerListado(sucursal, busqueda, 50, 0);
            setData(result.datos);
        }
        catch {
            setData([]);
        }
        finally {
            setLoading(false);
        }
    }, [sucursal]);
    useEffect(() => {
        if (open) {
            setSearch('');
            cargar('');
        }
    }, [open, cargar]);
    const handleSearch = (val) => {
        setSearch(val);
        cargar(val);
    };
    return (_jsxs(Modal, { title: "Buscar Empleado", open: open, onCancel: onClose, footer: null, width: 600, destroyOnHidden: true, children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar por nombre o c\u00F3digo...", allowClear: true, value: search, onChange: (e) => setSearch(e.target.value), onSearch: handleSearch, style: { marginBottom: 16 }, prefix: _jsx(SearchOutlined, {}) }), _jsx(Table, { columns: [
                    { title: 'Código', dataIndex: 'codigo', width: 100 },
                    { title: 'Nombre', dataIndex: 'nombre', ellipsis: true,
                        render: (v) => toTitleCase(v) },
                    { title: 'Cédula', dataIndex: 'cedula', width: 130 },
                ], dataSource: data, rowKey: "codigo", loading: loading, size: "small", pagination: false, scroll: { y: 350 }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay empleados" }) }) }, onRow: (record) => ({
                    style: { cursor: 'pointer' },
                    onClick: () => {
                        onSelect({ codigo: record.codigo, nombre: record.nombre });
                        onClose();
                    },
                }) })] }));
};
export default BuscarEmpleadoModal;
