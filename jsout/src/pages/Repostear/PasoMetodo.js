import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Row, Col, Typography } from 'antd';
import { FileSearchOutlined, WarningOutlined, FilterOutlined, CheckCircleFilled, CalendarOutlined, } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { hexToRgba } from '../../utils/themeUtils';
const { Text } = Typography;
const METODOS = [
    {
        value: 'rangoFechas',
        label: 'Por Rango de Fechas',
        description: 'Repostear documentos por tipo y rango de fechas usando procesamiento por lote',
        icon: _jsx(CalendarOutlined, {}),
        color: '#556ee6',
    },
    {
        value: 'documento',
        label: 'Un Documento',
        description: 'Buscar y repostear un documento individual por su número',
        icon: _jsx(FileSearchOutlined, {}),
        color: '#7c8ff5',
    },
    {
        value: 'noCuadrados',
        label: 'Asientos No Cuadrados',
        description: 'Buscar documentos con asientos contables que no cuadran',
        icon: _jsx(WarningOutlined, {}),
        color: '#faad14',
    },
    {
        value: 'criterio',
        label: 'Según Criterio',
        description: 'Repostear documentos filtrando por tipo, fecha, entidad, concepto o cuenta bancaria',
        icon: _jsx(FilterOutlined, {}),
        color: '#52c41a',
    },
];
const PasoMetodo = ({ value, onChange }) => {
    const isDarkMode = useUIStore((s) => s.isDarkMode);
    const primaryColor = useUIStore((s) => s.primaryColor);
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    color: primaryColor,
                    fontWeight: 500,
                }, children: "Seleccione el m\u00E9todo de posteo" }), _jsx(Row, { gutter: [20, 20], children: METODOS.map((m) => {
                    const isSelected = value === m.value;
                    return (_jsx(Col, { xs: 24, sm: 12, md: 6, children: _jsxs("div", { className: `repostear-tile ${isSelected ? 'repostear-tile--selected' : ''}`, onClick: () => onChange(m.value), style: { padding: '28px 20px', textAlign: 'center', minHeight: 200 }, children: [_jsx(CheckCircleFilled, { className: "repostear-tile__check" }), _jsx("div", { className: "repostear-tile__icon-circle", style: isSelected ? {} : { background: isDarkMode ? hexToRgba(primaryColor, 0.2) : '#f0f3ff' }, children: React.isValidElement(m.icon) && React.cloneElement(m.icon, {
                                        style: { fontSize: 28, color: isSelected ? '#fff' : (m.value === 'rangoFechas' ? primaryColor : m.color) },
                                    }) }), _jsx(Text, { strong: true, style: {
                                        fontSize: 16,
                                        color: isSelected ? primaryColor : isDarkMode ? '#e0e0e0' : '#333',
                                        display: 'block',
                                        marginBottom: 8,
                                    }, children: m.label }), _jsx(Text, { type: "secondary", style: { fontSize: 13, lineHeight: 1.5 }, children: m.description })] }) }, m.value));
                }) })] }));
};
export default PasoMetodo;
