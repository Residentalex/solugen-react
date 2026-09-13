import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Tag } from 'antd';
const BuscadorGlobalResultado = ({ icono, titulo, subtitulo, tag, tagColor, isActive, onClick, sucursales, }) => {
    return (_jsxs("div", { onClick: onClick, style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.15s',
            background: isActive ? 'var(--paces-hover-bg)' : 'transparent',
        }, onMouseEnter: (e) => {
            if (!isActive)
                e.currentTarget.style.background = 'var(--paces-hover-bg)';
        }, onMouseLeave: (e) => {
            if (!isActive)
                e.currentTarget.style.background = 'transparent';
        }, children: [_jsx("div", { style: {
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'var(--paces-bg-layout)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                }, children: icono }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 14, color: 'var(--paces-text)' }, children: titulo }), sucursales && sucursales.length > 0 && (_jsx("div", { style: { display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }, children: sucursales.map((s) => (_jsx(Tag, { style: {
                                fontSize: 10,
                                lineHeight: '16px',
                                padding: '0 6px',
                                margin: 0,
                                borderRadius: 4,
                            }, children: s }, s))) })), _jsx("div", { style: { fontSize: 12, color: 'var(--paces-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: subtitulo })] }), _jsx("span", { style: {
                    fontSize: 12,
                    fontWeight: 500,
                    color: tagColor === 'green' ? '#34c38f' : tagColor === 'blue' ? '#556ee6' : tagColor === 'purple' ? '#9b8cff' : 'var(--paces-text-secondary)',
                    background: tagColor === 'green' ? 'rgba(52,195,143,0.1)' : tagColor === 'blue' ? 'rgba(85,110,230,0.1)' : tagColor === 'purple' ? 'rgba(155,140,255,0.1)' : 'var(--paces-bg-layout)',
                    padding: '2px 10px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                }, children: tag })] }));
};
export default BuscadorGlobalResultado;
