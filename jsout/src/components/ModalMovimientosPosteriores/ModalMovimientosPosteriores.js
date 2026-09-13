import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Modal, Table, Empty } from 'antd';
import { formatNumber, formatDate } from '../../utils/formats';
const ModalMovimientosPosteriores = ({ open, sucursal, codigo, dataSource, loading, onClose, }) => {
    return (_jsx(Modal, { title: `Movimientos posteriores — ${sucursal} — ${codigo || ''}`, open: open, onCancel: onClose, footer: null, width: 700, destroyOnHidden: true, children: _jsx(Table, { dataSource: dataSource, rowKey: "transacid", size: "small", pagination: { pageSize: 10, showSizeChanger: false }, loading: loading, locale: { emptyText: _jsx(Empty, { description: "No hay movimientos posteriores" }) }, columns: [
                { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (v) => formatDate(v) },
                { title: 'Documento', dataIndex: 'documento', width: 160, ellipsis: true },
                { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right', render: (v) => formatNumber(v) },
            ], scroll: { x: 600 } }) }));
};
export default ModalMovimientosPosteriores;
