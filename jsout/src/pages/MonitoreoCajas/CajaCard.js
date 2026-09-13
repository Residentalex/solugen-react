import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Tag } from 'antd';
const CajaCard = ({ caja, onClick }) => {
    return (_jsx(Card, { hoverable: true, className: "paces-card", style: {
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
        }, styles: {
            body: { padding: 16 },
        }, onClick: () => onClick(caja), children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 12 }, children: [_jsx("div", { style: {
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: caja.conectado ? '#52c41a' : '#ff4d4f',
                        flexShrink: 0,
                        marginTop: 4,
                        boxShadow: caja.conectado
                            ? '0 0 6px rgba(82, 196, 26, 0.6)'
                            : '0 0 6px rgba(255, 77, 79, 0.6)',
                    } }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                fontWeight: 600,
                                fontSize: 14,
                                color: '#1a1a2e',
                                marginBottom: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }, children: caja.nombre }), _jsx("div", { style: {
                                fontFamily: 'monospace',
                                fontSize: 12,
                                color: '#8c8c8c',
                                marginBottom: 6,
                            }, children: caja.ip }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsxs(Tag, { style: {
                                        fontSize: 11,
                                        lineHeight: '18px',
                                        padding: '0 6px',
                                        borderRadius: 4,
                                        margin: 0,
                                    }, color: caja.conectado ? 'green' : 'red', children: ["v", caja.version] }), _jsxs("span", { style: { fontSize: 11, color: '#8c8c8c' }, children: ["No. ", caja.noCaja] })] })] })] }) }));
};
export default CajaCard;
