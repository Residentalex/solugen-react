import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Modal, Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatNumber, toTitleCase } from '../../utils/formats';
// ===== Helper para extraer valor de campos con nombre variable =====
function getCampo(obj, ...campos) {
    for (const c of campos) {
        const val = obj?.[c];
        if (val !== undefined && val !== null)
            return val;
    }
    return undefined;
}
const AgregarProductoGORCModal = ({ open, onClose, onSelectProducto, onSelectConteos, suplidorProductos, }) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 100,
        },
        {
            title: 'Producto',
            dataIndex: 'articulo',
            key: 'articulo',
            ellipsis: true,
            render: (v) => toTitleCase(v || ''),
        },
        {
            title: 'Costo',
            key: 'costo',
            width: 80,
            align: 'right',
            render: (_, record) => formatNumber(record._costo || 0),
        },
    ];
    const handleAgregar = () => {
        if (selectedRowKeys.length === 0)
            return;
        const seleccionados = (suplidorProductos ?? []).filter((d) => selectedRowKeys.includes(d.codigo));
        onSelectConteos(seleccionados);
        onClose();
    };
    return (_jsxs(Modal, { title: "Agregar producto", open: open, onCancel: onClose, footer: null, width: 650, destroyOnHidden: true, children: [_jsx("p", { style: { fontSize: 12, color: '#8c8c8c', marginBottom: 12 }, children: "Productos del suplidor. Seleccione los que desea agregar." }), _jsx(Table, { dataSource: suplidorProductos ?? [], columns: columns, rowKey: (r) => r.codigo || Math.random().toString(), size: "small", pagination: false, scroll: { y: 350 }, rowSelection: {
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                }, locale: { emptyText: 'No se encontraron productos para este suplidor.' } }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 }, children: _jsxs(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleAgregar, disabled: selectedRowKeys.length === 0, children: ["Agregar seleccionados (", selectedRowKeys.length, ")"] }) })] }));
};
export default AgregarProductoGORCModal;
