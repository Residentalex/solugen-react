import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Typography } from 'antd';
import { getInitials, toTitleCase, getColorMonograma, getColorFromName, truncateText } from '../utils/formats';
const { Text } = Typography;
const EntidadColumnCell = ({ name, diasCredito, identificacion }) => {
    const bgColor = diasCredito !== undefined && diasCredito !== null
        ? getColorMonograma(diasCredito)
        : getColorFromName(name);
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }, children: [_jsx("div", { className: "paces-avatar-initials", style: { backgroundColor: bgColor, flexShrink: 0 }, children: getInitials(name) }), _jsxs("div", { children: [_jsx("div", { children: _jsx(Text, { children: truncateText(toTitleCase(name)) }) }), identificacion && (_jsxs("div", { className: "paces-text-secondary", style: { fontSize: 10, lineHeight: 1.4, marginTop: 1 }, children: ["RNC: ", identificacion] }))] })] }));
};
export default EntidadColumnCell;
