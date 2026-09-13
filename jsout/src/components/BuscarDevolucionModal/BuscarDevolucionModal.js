import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Button, Space, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { formatDate, formatNumber } from '../../utils/formats';
const BuscarDevolucionModal = ({ open, onClose, onSelect, codEntidad }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [devoluciones, setDevoluciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const cargar = useCallback(async () => {
        if (!codEntidad)
            return;
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/Transaccion/${sucursalActiva}/pendienteInv/${codEntidad}`);
            const items = (data?.data || []).map((d) => ({
                id: d.id,
                documento: d.documento?.codigo ? `${d.documento.codigo}-${d.noDocumento}` : d.noDocumento,
                fecha: d.fechaDocumento,
                total: d.total,
            }));
            setDevoluciones(items);
        }
        catch {
            message.error('Error al cargar devoluciones');
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, codEntidad]);
    useEffect(() => {
        if (open) {
            cargar();
            setSelectedRowKeys([]);
        }
    }, [open, cargar]);
    const columnas = [
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v) => formatDate(v) },
        {
            title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right',
            render: (v) => formatNumber(v),
        },
    ];
    const handleConfirm = () => {
        const selected = selectedRowKeys.map((key) => {
            const dev = devoluciones.find((d) => d.id === key);
            return {
                transaccionAsociadaID: dev?.id,
                documento: dev?.documento,
                fecha: dev?.fecha,
                montoOriginal: dev?.total || 0,
                monto: 0,
                esDocumentoInventario: true,
            };
        });
        onSelect(selected);
        onClose();
    };
    return (_jsx(Modal, { title: "Buscar Devoluciones", open: open, onCancel: onClose, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: onClose, children: "Cancelar" }), _jsxs(Button, { type: "primary", onClick: handleConfirm, disabled: selectedRowKeys.length === 0, children: ["Agregar (", selectedRowKeys.length, ")"] })] }), width: 700, destroyOnHidden: true, children: _jsx(Table, { dataSource: devoluciones, columns: columnas, rowKey: "id", loading: loading, size: "small", pagination: { pageSize: 10, showSizeChanger: false }, rowSelection: {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
            } }) }));
};
export default BuscarDevolucionModal;
