import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Typography, Input, Space, Row, Col, Empty, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatDate, formatNumber, formatCurrency } from '../../utils/formats';
const { Text } = Typography;
const DocumentosBalanceCard = ({ debitos, creditos }) => {
    const [search, setSearch] = useState('');
    const { useToken } = theme;
    const { token } = useToken();
    const totalDebitos = useMemo(() => debitos.reduce((s, t) => s + (t.monto || 0), 0), [debitos]);
    const totalCreditos = useMemo(() => creditos.reduce((s, t) => s + (t.monto || 0), 0), [creditos]);
    const pendiente = totalDebitos - totalCreditos;
    const asociadasUnificadas = useMemo(() => {
        const todos = [
            ...debitos.map((d) => ({ ...d, _tipo: 'debito' })),
            ...creditos.map((c) => ({ ...c, _tipo: 'credito' })),
        ];
        if (search) {
            const q = search.toLowerCase();
            return todos.filter((t) => (t.documento || '').toLowerCase().includes(q) ||
                (t.nCF || '').toLowerCase().includes(q));
        }
        return todos;
    }, [debitos, creditos, search]);
    const columns = [
        {
            title: 'Tipo',
            key: 'tipo',
            width: 80,
            fixed: 'left',
            render: (_, record) => record._tipo === 'debito' ? (_jsx(Tag, { color: "blue", icon: _jsx(ArrowUpOutlined, {}), children: "D\u00C9B" })) : (_jsx(Tag, { color: "green", icon: _jsx(ArrowDownOutlined, {}), children: "CR\u00C9" })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 100,
            render: (v) => formatDate(v),
        },
        { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
        {
            title: 'NCF',
            dataIndex: 'nCF',
            key: 'nCF',
            width: 140,
            render: (v) => v || '—',
        },
        {
            title: 'Monto Original',
            dataIndex: 'montoOriginal',
            key: 'montoOriginal',
            width: 130,
            align: 'right',
            render: (v) => formatNumber(v),
        },
        {
            title: 'Pagado',
            dataIndex: 'pagado',
            key: 'pagado',
            width: 110,
            align: 'right',
            render: (v) => formatNumber(v),
        },
        {
            title: 'Saldo Pendiente',
            dataIndex: 'saldoPendiente',
            key: 'saldoPendiente',
            width: 120,
            align: 'right',
            render: (v) => (_jsx(Text, { strong: true, style: { color: v > 0 ? token.colorWarning : undefined }, children: formatNumber(v) })),
        },
        {
            title: 'Retención',
            dataIndex: 'retencion',
            key: 'retencion',
            width: 110,
            align: 'right',
            responsive: ['md'],
            render: (v) => formatNumber(v || 0),
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            width: 120,
            align: 'right',
            render: (_, record) => (_jsx(Text, { strong: true, style: { color: record._tipo === 'debito' ? token.colorPrimary : token.colorSuccess }, children: formatNumber(_) })),
        },
    ];
    return (_jsxs("div", { children: [_jsxs(Card, { size: "small", style: {
                    marginBottom: 12,
                    background: token.colorBgLayout,
                    border: `1px solid ${token.colorBorderSecondary}`,
                }, children: [_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { span: 8, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "D\u00E9bitos" }), _jsx("div", { children: _jsx(Text, { strong: true, style: { fontSize: 16 }, children: formatCurrency(totalDebitos) }) })] }), _jsxs(Col, { span: 8, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Cr\u00E9ditos" }), _jsx("div", { children: _jsx(Text, { strong: true, style: { fontSize: 16, color: token.colorSuccess }, children: formatCurrency(totalCreditos) }) })] }), _jsxs(Col, { span: 8, children: [_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "Pendiente" }), _jsx("div", { children: _jsx(Text, { strong: true, style: {
                                                fontSize: 16,
                                                color: pendiente === 0
                                                    ? token.colorSuccess
                                                    : pendiente > 0
                                                        ? token.colorWarning
                                                        : token.colorError,
                                            }, children: formatCurrency(Math.abs(pendiente)) }) })] })] }), pendiente === 0 && (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 }, children: _jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "Cuadrado" }) }))] }), _jsx("div", { style: { marginBottom: 8 }, children: _jsx(Input.Search, { placeholder: "Buscar documento...", allowClear: true, style: { maxWidth: 250 }, onSearch: (value) => setSearch(value), onChange: (e) => {
                        if (!e.target.value)
                            setSearch('');
                    } }) }), _jsx(Table, { dataSource: asociadasUnificadas, columns: columns, rowKey: (r) => r.transaccionAsociadaID || r.id, size: "small", pagination: false, scroll: { x: 1000 }, onRow: (record) => ({
                    style: record._tipo === 'credito' ? { background: token.colorSuccessBg } : undefined,
                }), locale: {
                    emptyText: (_jsx("div", { style: {
                            minHeight: 160,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: _jsx(Empty, { description: "No hay documentos de distribuci\u00F3n" }) })),
                } })] }));
};
export default DocumentosBalanceCard;
