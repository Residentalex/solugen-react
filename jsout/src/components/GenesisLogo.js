import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const GenesisLogo = ({ size = 30, showText = true, dark = false }) => {
    const boxSize = Math.max(size, 28);
    const fontSize = boxSize * 0.5;
    const textSize = Math.max(size * 0.65, 16);
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("div", { style: {
                    width: boxSize,
                    height: boxSize,
                    background: 'linear-gradient(135deg, #6c5ffc, #9b8cff)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize,
                    boxShadow: '0 3px 8px rgba(108,95,252,0.3)',
                    flexShrink: 0,
                }, children: "G" }), showText && (_jsx("span", { style: {
                    fontSize: textSize,
                    fontWeight: 700,
                    color: dark ? '#ffffff' : '#1e1e2d',
                    letterSpacing: '-0.5px',
                }, children: "enesis" }))] }));
};
export default GenesisLogo;
