import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { toTitleCase } from '../../utils/formats';
const BuscarTipoModal = ({ open, onClose, onSelect, tipoDocumento, tipoEntidad: _tipoEntidad }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/Tipo/${sucursalActiva}/documento/${tipoDocumento}`);
            setTipos(data?.data || []);
        }
        catch {
            message.error('Error al cargar tipos');
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, tipoDocumento]);
    useEffect(() => {
        if (open)
            cargar();
    }, [open, cargar]);
    const columnas = [
        { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
        {
            title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
            render: (v) => toTitleCase(v),
        },
    ];
    return (_jsx(Modal, { title: "Buscar Tipo", open: open, onCancel: onClose, footer: null, width: 600, destroyOnHidden: true, children: _jsx(Table, { dataSource: tipos, columns: columnas, rowKey: "codigo", loading: loading, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, onRow: (record) => ({
                onClick: () => { onSelect(record); onClose(); },
                style: { cursor: 'pointer' },
            }) }) }));
};
export default BuscarTipoModal;
