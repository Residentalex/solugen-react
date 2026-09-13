import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
const { Text } = Typography;
const BannersGrid = ({ banners }) => {
    const navigate = useNavigate();
    return (_jsx("section", { className: "store-section", children: _jsx(Row, { gutter: [16, 16], children: banners.map((banner) => (_jsx(Col, { xs: 24, md: 8, children: _jsx(Card, { className: "store-banner-card", bordered: false, styles: { body: { padding: 0, height: '100%' } }, onClick: () => navigate(banner.ctaLink), role: "button", tabIndex: 0, onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(banner.ctaLink);
                        }
                    }, children: _jsxs("div", { className: "store-banner-content", children: [_jsxs("div", { className: "store-banner-text", children: [_jsx(Text, { strong: true, className: "store-banner-title", children: banner.titulo }), _jsx(Text, { className: "store-banner-desc", children: banner.descripcion }), _jsx(Button, { type: "primary", size: "small", icon: _jsx(ArrowRightOutlined, {}), className: "store-banner-btn", children: banner.ctaTexto })] }), _jsx("div", { className: "store-banner-image", children: _jsx(ArrowRightOutlined, { style: { fontSize: 48, opacity: 0.3 } }) })] }) }) }, banner.id))) }) }));
};
export default BannersGrid;
