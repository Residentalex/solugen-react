import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Button, Typography } from 'antd';
import { ShoppingOutlined, ArrowRightOutlined } from '@ant-design/icons';
const { Title, Text } = Typography;
const HeroSection = () => {
    const navigate = useNavigate();
    return (_jsx("section", { className: "store-hero", children: _jsxs(Row, { gutter: [24, 24], align: "middle", children: [_jsx(Col, { xs: 24, lg: 12, children: _jsxs("div", { className: "store-hero-content", children: [_jsx(Title, { level: 1, className: "store-hero-title", children: "Todo lo que necesitas para tu negocio" }), _jsx(Text, { className: "store-hero-description", children: "Descubre miles de productos de tecnolog\u00EDa, oficina y hogar con los mejores precios del mercado. Env\u00EDo r\u00E1pido y garant\u00EDa real en todas tus compras." }), _jsxs("div", { className: "store-hero-buttons", children: [_jsx(Button, { type: "primary", size: "large", icon: _jsx(ShoppingOutlined, {}), onClick: () => navigate('/store?nuevos=true'), children: "Explorar Productos" }), _jsx(Button, { size: "large", icon: _jsx(ArrowRightOutlined, {}), onClick: () => navigate('/store?ofertas=true'), children: "Ver Ofertas" })] })] }) }), _jsx(Col, { xs: 24, lg: 12, children: _jsxs("div", { className: "store-hero-card", children: [_jsx("div", { className: "store-hero-image", children: _jsx(ShoppingOutlined, {}) }), _jsxs("div", { className: "store-hero-overlay", children: [_jsx(Text, { strong: true, className: "store-hero-overlay-title", children: "Nuevos ingresos cada semana" }), _jsx(Text, { className: "store-hero-overlay-desc", children: "M\u00E1s de 500 productos disponibles" })] })] }) })] }) }));
};
export default HeroSection;
