import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef } from 'react';
import { Table, InputNumber, Button, Tag, Tooltip, Empty, Popconfirm } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, ThunderboltOutlined, DeleteOutlined } from '@ant-design/icons';
import { toTitleCase } from '../../utils/formats';
import { formatNumber, esDebito, esCredito } from '../../utils/contabilidad';
const AsientosContableEditables = ({ asientos, onChange, editable = false, scroll, rowKey, onGenerar, generando = false, disableGenerar = false, }) => {
    const editValuesRef = useRef({});
    const totalDebitos = (asientos || []).reduce((s, r) => s + (esDebito(r.tipoAsiento) ? r.monto : 0), 0);
    const totalCreditos = (asientos || []).reduce((s, r) => s + (esCredito(r.tipoAsiento) ? r.monto : 0), 0);
    const diferencia = Math.abs(totalDebitos - totalCreditos);
    const esCuadrado = diferencia < 0.01;
    const handleMontoChange = (index, field, value) => {
        editValuesRef.current[`${index}_${field}`] = value || 0;
    };
    const handleMontoCommit = (index, field) => {
        const val = editValuesRef.current[`${index}_${field}`];
        if (val === undefined)
            return;
        onChange((asientos || []).map((r, i) => {
            if (i !== index)
                return r;
            const montoRedondeado = Math.round(val * 100) / 100;
            const upd = { ...r, monto: montoRedondeado };
            if (montoRedondeado > 0 && r.monto === 0) {
                upd.tipoAsiento = field === 'debito' ? 'D' : 'C';
            }
            return upd;
        }));
    };
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
            ellipsis: true,
            render: (_, r) => (r.cuentaContable?.nombre ? toTitleCase(r.cuentaContable.nombre) : '-'),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            ellipsis: true,
            render: (v) => (v ? toTitleCase(v) : '-'),
        },
        {
            title: 'Débito',
            key: 'debito',
            width: 150,
            align: 'right',
            render: (_, r, index) => {
                const esD = esDebito(r.tipoAsiento);
                const mostrarInput = editable && (esD || r.monto === 0);
                if (mostrarInput) {
                    return (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: r.monto, onChange: (val) => handleMontoChange(index, 'debito', val), onBlur: () => handleMontoCommit(index, 'debito'), onPressEnter: () => handleMontoCommit(index, 'debito') }));
                }
                if (esD) {
                    return (_jsx(Tooltip, { title: formatNumber(r.monto), placement: "left", children: _jsx("span", { style: { color: '#f46a6a', fontWeight: 600 }, children: formatNumber(r.monto) }) }));
                }
                return null;
            },
        },
        {
            title: 'Crédito',
            key: 'credito',
            width: 150,
            align: 'right',
            render: (_, r, index) => {
                const esC = esCredito(r.tipoAsiento);
                const mostrarInput = editable && (esC || r.monto === 0);
                if (mostrarInput) {
                    return (_jsx(InputNumber, { size: "small", style: { width: '100%' }, styles: { input: { textAlign: 'right' } }, min: 0, step: 0.01, precision: 2, controls: false, defaultValue: r.monto, onChange: (val) => handleMontoChange(index, 'credito', val), onBlur: () => handleMontoCommit(index, 'credito'), onPressEnter: () => handleMontoCommit(index, 'credito') }));
                }
                if (esC) {
                    return (_jsx(Tooltip, { title: formatNumber(r.monto), placement: "left", children: _jsx("span", { style: { color: '#34c38f', fontWeight: 600 }, children: formatNumber(r.monto) }) }));
                }
                return null;
            },
        },
        {
            title: 'Generado',
            key: 'generado',
            width: 90,
            align: 'center',
            render: (_, r) => (_jsx(Tag, { color: r.generado === false ? 'gold' : 'blue', style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: r.generado === false ? 'Manual' : 'Auto' })),
        },
        ...(editable
            ? [{
                    title: 'Acc',
                    key: 'acciones',
                    width: 50,
                    align: 'center',
                    render: (_, r, index) => (_jsx(Popconfirm, { title: "\u00BFEliminar este asiento?", onConfirm: () => {
                            const filtered = (asientos || []).filter((_, i) => i !== index);
                            onChange(filtered);
                        }, okText: "Eliminar", cancelText: "Cancelar", placement: "left", children: _jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}) }) })),
                }]
            : []),
    ];
    return (_jsxs("div", { children: [onGenerar && (_jsx("div", { style: { marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }, children: _jsx(Button, { icon: _jsx(ThunderboltOutlined, {}), onClick: onGenerar, loading: generando, disabled: disableGenerar, children: "Generar asientos" }) })), _jsx(Table, { dataSource: asientos || [], columns: columns, rowKey: rowKey || 'id', size: "small", pagination: false, scroll: scroll || { x: 700 }, locale: {
                    emptyText: (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "Sin asientos contables", style: { padding: '24px 0' } })),
                }, summary: () => (_jsx(Table.Summary, { fixed: true, children: _jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { index: 0 }), _jsxs(Table.Summary.Cell, { index: 1, colSpan: 3, children: [_jsx("strong", { children: "Totales" }), esCuadrado ? (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), style: { marginLeft: 12, fontSize: 11 }, children: "Cuadrado" })) : (_jsxs(Tag, { color: "error", icon: _jsx(ExclamationCircleOutlined, {}), style: { marginLeft: 12, fontSize: 11 }, children: ["Diferencia: ", formatNumber(diferencia)] }))] }), _jsx(Table.Summary.Cell, { index: 4, align: "right", children: _jsx("strong", { style: { color: '#f46a6a' }, children: formatNumber(totalDebitos) }) }), _jsx(Table.Summary.Cell, { index: 5, align: "right", children: _jsx("strong", { style: { color: '#34c38f' }, children: formatNumber(totalCreditos) }) }), _jsx(Table.Summary.Cell, { index: editable ? 7 : 6 })] }) })) })] }));
};
export default AsientosContableEditables;
