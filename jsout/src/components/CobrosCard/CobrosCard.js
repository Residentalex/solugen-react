import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Table, Tag, Typography, Empty, Space, Skeleton } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { formatDate, formatCurrency, toTitleCase } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
const { Text } = Typography;
const CobrosCard = ({ cobros = [], readOnly = true, loading = false, scrollX, emptyText, }) => {
    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (v) => (v ? formatDate(v) : '-'),
        },
        {
            title: 'Medio Cobro',
            dataIndex: 'medioCobro',
            key: 'medioCobro',
            render: (v) => toTitleCase(v || ''),
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            width: 130,
            align: 'right',
            render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v ?? 0) }),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (v) => {
                const info = ESTADO_DOCUMENTO_MAP[v] || { label: 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
    ];
    const renderContent = () => {
        if (loading) {
            return _jsx(Skeleton, { active: true, paragraph: { rows: 3 } });
        }
        if (cobros.length === 0) {
            return (_jsx(Empty, { image: _jsx(DollarOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 13 }, children: emptyText || 'Sin cobros registrados' }) }));
        }
        return (_jsx(Table, { dataSource: cobros, rowKey: (r) => r.id || r.index || Math.random(), size: "small", pagination: false, scroll: { x: scrollX || 500 }, columns: columns }));
    };
    return (_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { size: 8, children: [_jsx(DollarOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Cobros" })] }), children: renderContent() }));
};
export default CobrosCard;
