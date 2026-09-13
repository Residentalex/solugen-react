import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Table, Tag, Tooltip, Empty, Typography } from 'antd';
import { toTitleCase } from '../utils/formats';
import { formatNumber } from '../utils/contabilidad';
const { Text } = Typography;
const columns = [
    {
        title: 'Código',
        key: 'codigo',
        width: 100,
        fixed: 'left',
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("span", { children: record.codigo || '-' }), record.referencia && (_jsx(Tooltip, { title: record.referencia, children: _jsx("div", { className: "paces-text-secondary", style: {
                            fontSize: 11,
                            lineHeight: 1.5,
                            marginTop: 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'left',
                        }, children: record.referencia }) }))] })),
    },
    {
        title: 'Artículo',
        key: 'articulo',
        ellipsis: true,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_, record) => (_jsxs("div", { style: { fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("span", { children: toTitleCase(record.articulo || '') }), _jsx("div", { className: "paces-text-secondary", style: {
                        fontSize: 11,
                        lineHeight: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                    }, children: record.familia?.nombre ? (_jsx(Tag, { style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: toTitleCase(record.familia.nombre) })) : null })] })),
    },
    {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 100,
        align: 'right',
        render: (val) => formatNumber(val || 0),
    },
    {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        width: 110,
        align: 'right',
        responsive: ['md'],
        render: (val) => formatNumber(val || 0),
    },
    {
        title: 'SubTotal',
        dataIndex: 'subTotal',
        key: 'subTotal',
        width: 110,
        align: 'right',
        responsive: ['lg'],
        render: (val) => formatNumber(val || 0),
    },
    {
        title: 'Descuento',
        dataIndex: 'descuento',
        key: 'descuento',
        width: 100,
        align: 'right',
        responsive: ['lg'],
        render: (val) => formatNumber(val || 0),
    },
    {
        title: 'Impuestos',
        dataIndex: 'impuestos',
        key: 'impuestos',
        width: 120,
        align: 'right',
        responsive: ['lg'],
        render: (val) => formatNumber(val || 0),
    },
    {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 110,
        align: 'right',
        render: (val) => _jsx(Text, { strong: true, children: formatNumber(val || 0) }),
    },
];
const DetalleMovimientoTable = ({ detalles, scroll, rowKey }) => (_jsx(Table, { dataSource: detalles || [], columns: columns, rowKey: rowKey || 'id', size: "small", pagination: false, scroll: scroll || { x: 1000 }, locale: {
        emptyText: (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "Sin detalles de movimiento", style: { padding: '24px 0' } })),
    } }));
export default DetalleMovimientoTable;
