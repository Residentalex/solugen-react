import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, Table, Input, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';
const BuscarEntradaModal = ({ open, onClose, onSelect, entidad, onBuscar }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const searchRef = useRef(null);
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);
    function fmtFecha(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${y}${m}${day}${hh}${mm}${ss}`;
    }
    const buscar = useCallback(async (texto) => {
        setLoading(true);
        try {
            const params = { cantidad: 50 };
            if (texto) {
                params.texto = texto;
            }
            else {
                params.desde = fmtFecha(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
                params.hasta = fmtFecha(new Date());
            }
            if (entidad)
                params.entidad = entidad;
            const res = await onBuscar(sucursalActiva, params);
            setResultados(res || []);
        }
        catch (err) {
            const msg = extraerMensajeError(err, 'Error al buscar entradas de almacén');
            message.error(msg);
            setResultados([]);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, entidad, onBuscar]);
    useEffect(() => {
        if (open) {
            setSearchText('');
            buscar();
        }
    }, [open, buscar]);
    const columnas = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 150,
            render: (v) => _jsx("span", { className: "paces-text-primary", children: v }),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (v) => formatDate(v),
        },
        {
            title: 'Suplidor',
            dataIndex: 'entidad',
            key: 'entidad',
            ellipsis: true,
            render: (v) => toTitleCase(v || ''),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            align: 'right',
            render: (v) => formatCurrency(v || 0),
        },
    ];
    return (_jsxs(Modal, { title: "Buscar Entrada de Almac\u00E9n", open: open, onCancel: onClose, footer: null, width: 800, destroyOnHidden: true, children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar...", allowClear: true, value: searchText, onChange: (e) => setSearchText(e.target.value), onSearch: (value) => buscar(value || undefined), style: { marginBottom: 16 } }), _jsx(Table, { dataSource: resultados, columns: columnas, rowKey: "id", loading: loading, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, scroll: { y: 400 }, onRow: (record) => ({
                    onClick: () => { onSelect(record); onClose(); },
                    style: { cursor: 'pointer' },
                }) })] }));
};
export default BuscarEntradaModal;
