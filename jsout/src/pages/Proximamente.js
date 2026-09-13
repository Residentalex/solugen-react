import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { Card, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores/uiStore';
const { Title, Text } = Typography;
const Proximamente = ({ modulo, codigo }) => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    useEffect(() => {
        setActiveModule(codigo);
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar, codigo]);
    return (_jsxs(Card, { className: "paces-card-erp", style: {
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
        }, styles: { body: { width: '100%', textAlign: 'center', padding: '60px 24px' } }, children: [_jsx(ClockCircleOutlined, { style: { fontSize: 64, color: '#556ee6', marginBottom: 24 } }), _jsx(Title, { level: 3, children: modulo }), _jsx(Text, { style: { fontSize: 16, color: '#888' }, children: "Esta funcionalidad estar\u00E1 disponible pr\u00F3ximamente." })] }));
};
export default Proximamente;
