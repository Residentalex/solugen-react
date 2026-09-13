import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Table } from 'antd';
import { formatCurrency, toTitleCase } from '../../utils/formats';
const TablaImpuestosDetalle = ({ dataSource, loading = false, emptyText = 'Sin impuestos', }) => {
    return (_jsx(Table, { dataSource: dataSource, rowKey: (r) => r.transactionID != null ? `${r.transactionID}-${r.impuesto?.idExterno || ''}` : r.impuesto?.idExterno || Math.random().toString(), size: "small", pagination: false, loading: loading, scroll: { x: 600 }, locale: { emptyText }, columns: [
            {
                title: 'Impuesto / Retención',
                key: 'nombre',
                ellipsis: true,
                render: (_, r) => toTitleCase(r.impuesto?.nombre || '-'),
            },
            {
                title: 'Porcentaje',
                key: 'porcentaje',
                width: 100,
                align: 'right',
                render: (_, r) => (r.impuesto?.porcentaje != null ? `${r.impuesto.porcentaje}%` : '-'),
            },
            {
                title: 'No. Cuenta',
                key: 'cuenta',
                width: 150,
                render: (_, r) => r.impuesto?.noCuenta || '-',
            },
            {
                title: 'Monto',
                key: 'monto',
                width: 140,
                align: 'right',
                render: (_, r) => formatCurrency(r.monto || 0),
            },
            {
                title: 'Tipo',
                key: 'tipo',
                width: 120,
                render: (_, r) => {
                    if (r.tipo)
                        return toTitleCase(r.tipo);
                    if (r.impuesto?.tipo === 1)
                        return 'Impuesto';
                    if (r.impuesto?.tipo === 2)
                        return 'Retención';
                    return '-';
                },
            },
        ] }));
};
export default TablaImpuestosDetalle;
