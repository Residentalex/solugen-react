import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, message, Spin } from 'antd';
import { conceptosApi } from '../../api/conceptosApi';
import { toTitleCase } from '../../utils/formats';
const BuscarConceptoModal = ({ open, onClose, onSelect, fetchConceptos, title = 'Buscar Concepto', sucursal, documento, tipo, tipoEntidad, }) => {
    const [conceptos, setConceptos] = useState([]);
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
        const filterActivos = (items) => (items || []).filter((c) => c.activo !== false);
        const handleFinally = () => setLoading(false);
        if (sucursal != null && documento && tipo) {
            conceptosApi.obtenerConceptosPorDocumentoTipo(sucursal, documento, tipo, tipoEntidad)
                .then((res) => setConceptos(filterActivos(res)))
                .catch(() => message.error('Error al cargar conceptos'))
                .finally(handleFinally);
        }
        else if (sucursal != null && documento) {
            conceptosApi.obtenerConceptosPorDocumento(sucursal, documento)
                .then((res) => setConceptos(filterActivos(res)))
                .catch(() => message.error('Error al cargar conceptos'))
                .finally(handleFinally);
        }
        else {
            fetchConceptos()
                .then((res) => setConceptos(filterActivos(res)))
                .catch(() => message.error('Error al cargar conceptos'))
                .finally(handleFinally);
        }
    }, [open, fetchConceptos, sucursal, documento, tipo, tipoEntidad]);
    const conceptosFiltrados = useMemo(() => {
        if (!searchText)
            return conceptos;
        const q = searchText.toLowerCase();
        return conceptos.filter((c) => (c.codigo || '').toLowerCase().includes(q) ||
            (c.nombre || '').toLowerCase().includes(q));
    }, [conceptos, searchText]);
    const columnas = [
        {
            title: 'Concepto',
            key: 'concepto',
            render: (_, record) => (_jsxs("span", { children: [_jsx("strong", { children: record.codigo }), " - ", toTitleCase(record.nombre || '')] })),
        },
    ];
    return (_jsx(Modal, { title: title, open: open, onCancel: onClose, footer: null, width: 600, destroyOnHidden: true, children: _jsxs(Spin, { spinning: loading, tip: "Cargando conceptos...", children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar por c\u00F3digo o nombre...", allowClear: true, onSearch: (val) => setSearchText(val || ''), onChange: (e) => {
                        if (!e.target.value)
                            setSearchText('');
                    }, style: { marginBottom: 16 } }), _jsx(Table, { dataSource: conceptosFiltrados, columns: columnas, rowKey: "codigo", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                        onClick: () => {
                            onSelect(record);
                            onClose();
                        },
                        style: { cursor: 'pointer' },
                    }), locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay conceptos" }) }) } })] }) }));
};
export default BuscarConceptoModal;
