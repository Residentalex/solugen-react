import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { TruckOutlined, SafetyOutlined, CustomerServiceOutlined, CheckCircleOutlined, UndoOutlined, SafetyCertificateOutlined, } from '@ant-design/icons';
const { Title, Text } = Typography;
const iconMap = {
    TruckOutlined: _jsx(TruckOutlined, {}),
    SafetyOutlined: _jsx(SafetyOutlined, {}),
    CustomerServiceOutlined: _jsx(CustomerServiceOutlined, {}),
    CheckCircleOutlined: _jsx(CheckCircleOutlined, {}),
    UndoOutlined: _jsx(UndoOutlined, {}),
    SafetyCertificateOutlined: _jsx(SafetyCertificateOutlined, {}),
};
const BeneficiosSection = ({ beneficios }) => {
    return (_jsxs("section", { className: "store-section", children: [_jsx(Title, { level: 4, className: "store-section-title", children: "\u00BFPor qu\u00E9 comprar con nosotros?" }), _jsx(Row, { gutter: [24, 24], children: beneficios.map((beneficio) => (_jsx(Col, { xs: 24, sm: 12, lg: 8, xl: 4, children: _jsxs(Card, { className: "store-beneficio-card", bordered: false, children: [_jsx("div", { className: "store-beneficio-icon", children: iconMap[beneficio.icono] || _jsx(CheckCircleOutlined, {}) }), _jsx(Title, { level: 5, className: "store-beneficio-title", children: beneficio.titulo }), _jsx(Text, { type: "secondary", className: "store-beneficio-desc", children: beneficio.descripcion })] }) }, beneficio.id))) })] }));
};
export default BeneficiosSection;
