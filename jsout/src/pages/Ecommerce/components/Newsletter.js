import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Card, Input, Button, Typography, message } from 'antd';
import { MailOutlined, SendOutlined } from '@ant-design/icons';
const { Title, Text } = Typography;
const Newsletter = () => {
    const [email, setEmail] = useState('');
    const handleSubscribe = useCallback(() => {
        if (!email || !email.includes('@')) {
            message.warning('Por favor ingresa un correo válido');
            return;
        }
        message.success('¡Gracias por suscribirte!');
        setEmail('');
    }, [email]);
    return (_jsx("section", { className: "store-section", children: _jsx(Card, { className: "store-newsletter-card", bordered: false, children: _jsxs("div", { className: "store-newsletter-content", children: [_jsx("div", { className: "store-newsletter-icon", children: _jsx(MailOutlined, {}) }), _jsx(Title, { level: 3, className: "store-newsletter-title", children: "Suscr\u00EDbete a nuestro newsletter" }), _jsx(Text, { className: "store-newsletter-desc", children: "Recibe las mejores ofertas, novedades y descuentos exclusivos directamente en tu correo." }), _jsxs("div", { className: "store-newsletter-form", children: [_jsx(Input, { type: "email", placeholder: "Ingresa tu correo electr\u00F3nico", value: email, onChange: (e) => setEmail(e.target.value), onPressEnter: handleSubscribe, size: "large", prefix: _jsx(MailOutlined, {}), style: { maxWidth: 360 } }), _jsx(Button, { type: "primary", size: "large", icon: _jsx(SendOutlined, {}), onClick: handleSubscribe, children: "Suscribirme" })] })] }) }) }));
};
export default Newsletter;
