import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Row, Col, Typography, Divider } from 'antd';
import { FacebookOutlined, InstagramOutlined, WhatsAppOutlined, MailOutlined, } from '@ant-design/icons';
const { Text } = Typography;
const StoreFooter = () => {
    const currentYear = new Date().getFullYear();
    const footerLinks = {
        empresa: [
            { label: 'Sobre Nosotros', href: '#' },
            { label: 'Nuestra Historia', href: '#' },
            { label: 'Equipo', href: '#' },
            { label: 'Trabaja con Nosotros', href: '#' },
        ],
        ayuda: [
            { label: 'Preguntas Frecuentes', href: '#' },
            { label: 'Envíos y Entregas', href: '#' },
            { label: 'Devoluciones', href: '#' },
            { label: 'Contacto', href: '#' },
        ],
        categorias: [
            { label: 'Tecnología', href: '/store?categoria=TEC' },
            { label: 'Oficina', href: '/store?categoria=OFI' },
            { label: 'Hogar', href: '/store?categoria=HOG' },
            { label: 'Deportes', href: '/store?categoria=DEP' },
        ],
        legal: [
            { label: 'Términos y Condiciones', href: '#' },
            { label: 'Política de Privacidad', href: '#' },
            { label: 'Política de Cookies', href: '#' },
        ],
    };
    return (_jsx("footer", { className: "store-footer", children: _jsxs("div", { className: "store-footer-content", children: [_jsxs(Row, { gutter: [32, 32], children: [_jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx(Text, { strong: true, className: "store-footer-title", children: "Empresa" }), _jsx("ul", { className: "store-footer-list", children: footerLinks.empresa.map((link) => (_jsx("li", { children: _jsx("a", { href: link.href, className: "store-footer-link", children: link.label }) }, link.label))) })] }), _jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx(Text, { strong: true, className: "store-footer-title", children: "Ayuda" }), _jsx("ul", { className: "store-footer-list", children: footerLinks.ayuda.map((link) => (_jsx("li", { children: _jsx("a", { href: link.href, className: "store-footer-link", children: link.label }) }, link.label))) })] }), _jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx(Text, { strong: true, className: "store-footer-title", children: "Categor\u00EDas" }), _jsx("ul", { className: "store-footer-list", children: footerLinks.categorias.map((link) => (_jsx("li", { children: _jsx("a", { href: link.href, className: "store-footer-link", children: link.label }) }, link.label))) })] }), _jsxs(Col, { xs: 24, sm: 12, md: 6, children: [_jsx(Text, { strong: true, className: "store-footer-title", children: "Legal" }), _jsx("ul", { className: "store-footer-list", children: footerLinks.legal.map((link) => (_jsx("li", { children: _jsx("a", { href: link.href, className: "store-footer-link", children: link.label }) }, link.label))) }), _jsxs("div", { className: "store-footer-social", children: [_jsx("a", { href: "#", className: "store-footer-social-link", "aria-label": "Facebook", children: _jsx(FacebookOutlined, {}) }), _jsx("a", { href: "#", className: "store-footer-social-link", "aria-label": "Instagram", children: _jsx(InstagramOutlined, {}) }), _jsx("a", { href: "#", className: "store-footer-social-link", "aria-label": "WhatsApp", children: _jsx(WhatsAppOutlined, {}) }), _jsx("a", { href: "#", className: "store-footer-social-link", "aria-label": "Correo", children: _jsx(MailOutlined, {}) })] })] })] }), _jsx(Divider, { style: { borderColor: 'var(--paces-border)', margin: '32px 0 16px' } }), _jsx("div", { className: "store-footer-bottom", children: _jsxs(Text, { type: "secondary", style: { fontSize: 13 }, children: ["\u00A9 ", currentYear, " Genesis Store. Todos los derechos reservados."] }) })] }) }));
};
export default StoreFooter;
