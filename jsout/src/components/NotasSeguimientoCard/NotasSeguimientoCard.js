import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Typography, Empty, Space, Skeleton } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { formatDate } from '../../utils/formats';
const { Text } = Typography;
const NotasSeguimientoCard = ({ notas = [], readOnly = true, loading = false, emptyText, }) => {
    const renderContent = () => {
        if (loading) {
            return _jsx(Skeleton, { active: true, paragraph: { rows: 3 } });
        }
        if (notas.length === 0) {
            return (_jsx(Empty, { image: _jsx(FileTextOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 13 }, children: emptyText || 'Sin notas de seguimiento' }) }));
        }
        return (_jsx("div", { children: notas.map((n) => (_jsxs("div", { style: {
                    marginBottom: 12,
                    padding: '8px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                    background: '#fff',
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Text, { strong: true, style: { fontSize: 12 }, children: n.usuario || '-' }), _jsx(Text, { className: "paces-text-secondary", style: { fontSize: 11 }, children: n.fecha ? formatDate(n.fecha) : '-' })] }), _jsx(Text, { style: { fontSize: 13, whiteSpace: 'pre-wrap' }, children: n.nota || '-' })] }, n.id))) }));
    };
    return (_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { size: 8, children: [_jsx(FileTextOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Notas de Seguimiento" })] }), children: renderContent() }));
};
export default NotasSeguimientoCard;
