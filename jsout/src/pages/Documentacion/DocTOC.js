import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Anchor, Typography } from 'antd';
const { Text } = Typography;
const DocTOC = ({ headings }) => {
    if (!headings || headings.length === 0)
        return null;
    return (_jsxs("div", { className: "doc-toc", children: [_jsx(Text, { strong: true, style: { fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12, color: 'var(--paces-text-secondary)' }, children: "En esta p\u00E1gina" }), _jsx("div", { className: "doc-toc-list", children: headings.map((h) => (_jsx("a", { href: `#${h.id}`, className: `doc-toc-item doc-toc-level-${h.level}`, onClick: (e) => {
                        e.preventDefault();
                        const el = document.getElementById(h.id);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Actualizar URL sin recargar
                            window.history.replaceState(null, '', `#${h.id}`);
                        }
                    }, children: h.text }, h.id))) })] }));
};
export default DocTOC;
