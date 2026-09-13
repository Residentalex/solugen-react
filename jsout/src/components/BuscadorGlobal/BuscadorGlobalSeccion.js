import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Tag } from 'antd';
const BuscadorGlobalSeccion = ({ icono, nombre, contador, children, }) => {
    return (_jsxs("div", { style: { marginTop: 20 }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    padding: '0 4px',
                }, children: [_jsx("span", { style: { fontSize: 16 }, children: icono }), _jsx("span", { style: { fontWeight: 600, fontSize: 13, color: 'var(--paces-text)' }, children: nombre }), _jsx(Tag, { color: "default", style: { fontSize: 11, lineHeight: '18px', borderRadius: 4 }, children: contador })] }), _jsx("div", { children: children })] }));
};
export default BuscadorGlobalSeccion;
