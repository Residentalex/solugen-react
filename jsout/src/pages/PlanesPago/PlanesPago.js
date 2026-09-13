import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { Card, Typography } from 'antd';
import { useUIStore } from '../../stores/uiStore';
const { Title, Text } = Typography;
const PlanesPago = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    useEffect(() => {
        setActiveModule('MPlanPago');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }, children: _jsxs(Card, { className: "paces-card-erp", style: { textAlign: 'center', borderRadius: 8, padding: 48, maxWidth: 500 }, children: [_jsx(Title, { level: 2, type: "secondary", style: { marginBottom: 8 }, children: "\uD83D\uDEA7 Pr\u00F3ximamente" }), _jsx(Text, { type: "secondary", style: { fontSize: 16 }, children: "La pantalla de Planes de Pago estar\u00E1 disponible en una pr\u00F3xima actualizaci\u00F3n." })] }) }));
};
export default PlanesPago;
