import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Card, Typography } from 'antd';
const { Text } = Typography;
const FacturacionTab = () => {
    return (_jsx(Card, { className: "paces-card", children: _jsxs("div", { style: { textAlign: 'center', padding: 48 }, className: "paces-text-secondary", children: [_jsx(Text, { type: "secondary", style: { fontSize: 16 }, children: "Historial de Facturaci\u00F3n - Pr\u00F3ximamente" }), _jsx("br", {}), _jsx(Text, { type: "secondary", children: "Aqu\u00ED se mostrar\u00E1n las facturas del cliente con su detalle." })] }) }));
};
export default FacturacionTab;
