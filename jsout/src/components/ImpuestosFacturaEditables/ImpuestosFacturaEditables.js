import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Table, Select, InputNumber } from 'antd';
import { toTitleCase, formatCurrency } from '../../utils/formats';
const ImpuestosFacturaEditables = ({ impuestos, onChange, editable = false, scroll, emptyText = 'Sin impuestos', }) => {
    return (_jsx(Table, { dataSource: impuestos, rowKey: "id", size: "small", pagination: false, scroll: scroll || { x: 600 }, locale: { emptyText }, columns: [
            {
                title: 'Tipo',
                dataIndex: 'tipo',
                key: 'tipo',
                width: 140,
                render: (v, _, idx) => {
                    if (!editable)
                        return toTitleCase(v || '');
                    return (_jsxs(Select, { size: "small", style: { width: '100%' }, value: v || undefined, onChange: (val) => {
                            const nuevos = [...impuestos];
                            nuevos[idx] = { ...nuevos[idx], tipo: val };
                            onChange(nuevos);
                        }, children: [_jsx(Select.Option, { value: "Impuesto", children: "Impuesto" }), _jsx(Select.Option, { value: "Retencion", children: "Retenci\u00F3n" }), _jsx(Select.Option, { value: "Informativo", children: "Informativo" })] }));
                },
            },
            {
                title: 'Nombre',
                key: 'nombre',
                ellipsis: true,
                render: (_v, record) => toTitleCase(record.impuesto?.nombre || record.nombre || ''),
            },
            {
                title: '%',
                dataIndex: 'porcentaje',
                key: 'porcentaje',
                width: 80,
                align: 'right',
                render: (v) => (v ? `${v}%` : '-'),
            },
            {
                title: 'Monto',
                dataIndex: 'monto',
                key: 'monto',
                width: 150,
                align: 'right',
                render: (v, _, idx) => {
                    if (!editable)
                        return formatCurrency(v || 0);
                    return (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, value: v, onChange: (val) => {
                            const nuevos = [...impuestos];
                            nuevos[idx] = { ...nuevos[idx], monto: val || 0 };
                            onChange(nuevos);
                        } }));
                },
            },
        ] }));
};
export default ImpuestosFacturaEditables;
