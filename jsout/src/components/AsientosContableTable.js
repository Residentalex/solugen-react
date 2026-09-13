import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Table, Tag, Tooltip, Empty } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { toTitleCase } from '../utils/formats';
import { formatNumber, esDebito, esCredito } from '../utils/contabilidad';
const columns = [
    {
        title: '#',
        key: 'index',
        width: 44,
        align: 'center',
        render: (_, __, index) => (_jsx("span", { className: "paces-text-secondary", style: { fontSize: 11 }, children: index + 1 })),
    },
    {
        title: 'Cuenta',
        key: 'cuenta',
        width: 120,
        render: (_, r) => r.cuentaContable?.noCuenta || '-',
    },
    {
        title: 'Nombre',
        key: 'nombre',
        render: (_, r) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13 }, children: toTitleCase(r.cuentaContable?.nombre || '-') }), r.descripcion && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.4 }, children: r.descripcion }))] })),
    },
    {
        title: 'Débito',
        key: 'debito',
        width: 140,
        align: 'right',
        render: (_, r) => esDebito(r.tipoAsiento) ? (_jsx(Tooltip, { title: formatNumber(r.monto), placement: "left", children: _jsx("span", { style: { color: '#f46a6a', fontWeight: 600 }, children: formatNumber(r.monto) }) })) : null,
    },
    {
        title: 'Crédito',
        key: 'credito',
        width: 140,
        align: 'right',
        render: (_, r) => esCredito(r.tipoAsiento) ? (_jsx(Tooltip, { title: formatNumber(r.monto), placement: "left", children: _jsx("span", { style: { color: '#34c38f', fontWeight: 600 }, children: formatNumber(r.monto) }) })) : null,
    },
    {
        title: 'Generado',
        key: 'generado',
        width: 90,
        align: 'center',
        render: (_, r) => (_jsx(Tag, { color: r.generado === false ? 'gold' : 'blue', style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: r.generado === false ? 'Manual' : 'Auto' })),
    },
];
const AsientosContableTable = ({ asientos, scroll, rowKey }) => {
    const totalDebitos = (asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
    const totalCreditos = (asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
    const diferencia = Math.abs(totalDebitos - totalCreditos);
    const esCuadrado = diferencia < 0.01;
    return (_jsx(Table, { dataSource: asientos || [], columns: columns, rowKey: rowKey || "id", size: "small", pagination: false, scroll: scroll || { x: 700 }, locale: {
            emptyText: (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "Sin asientos contables", style: { padding: '24px 0' } })),
        }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0 }), _jsxs(Table.Summary.Cell, { index: 1, colSpan: 2, children: [_jsx("strong", { children: "Totales" }), esCuadrado ? (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), style: { marginLeft: 12, fontSize: 11 }, children: "Cuadrado" })) : (_jsxs(Tag, { color: "error", icon: _jsx(ExclamationCircleOutlined, {}), style: { marginLeft: 12, fontSize: 11 }, children: ["Diferencia: ", formatNumber(diferencia)] }))] }), _jsx(Table.Summary.Cell, { index: 2, align: "right", children: _jsx("strong", { style: { color: '#f46a6a' }, children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 3, align: "right", children: _jsx("strong", { style: { color: '#34c38f' }, children: formatNumber(totalCreditos) }) }), _jsx(Table.Summary.Cell, { index: 4 })] }) })) }));
};
export default AsientosContableTable;
