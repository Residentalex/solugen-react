import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Typography, Row, Col, Card, Tag } from 'antd';
import { BookOutlined, FileTextOutlined, RightOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DOCS_INDEX from '../../docs/index';
const { Title, Text, Paragraph } = Typography;
const DocWelcomePage = () => {
    const navigate = useNavigate();
    const totalDocs = DOCS_INDEX.reduce((acc, mod) => acc + mod.docs.length, 0);
    return (_jsxs("div", { className: "doc-welcome", children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 48, marginTop: 32 }, children: [_jsx("div", { style: {
                            width: 72,
                            height: 72,
                            borderRadius: 20,
                            background: 'var(--paces-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                        }, children: _jsx(BookOutlined, { style: { fontSize: 32, color: '#fff' } }) }), _jsx(Title, { level: 1, style: { marginBottom: 8, fontSize: 32 }, children: "Documentaci\u00F3n de Solugen ERP" }), _jsx(Paragraph, { style: {
                            fontSize: 16,
                            color: 'var(--paces-text-secondary)',
                            maxWidth: 560,
                            margin: '0 auto',
                        }, children: "Explora la documentaci\u00F3n completa de los m\u00F3dulos y procesos del sistema. Selecciona un documento del \u00EDndice lateral para comenzar." }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsxs(Tag, { icon: _jsx(FileTextOutlined, {}), color: "blue", style: { fontSize: 13, padding: '4px 12px' }, children: [totalDocs, " documentos disponibles"] }), _jsxs(Tag, { style: { fontSize: 13, padding: '4px 12px' }, children: [DOCS_INDEX.length, " m\u00F3dulos"] })] })] }), _jsx(Row, { gutter: [16, 16], children: DOCS_INDEX.map((mod) => (_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs(Card, { hoverable: true, className: "doc-module-card", onClick: () => {
                            if (mod.docs.length > 0) {
                                navigate(`/documentacion/${mod.docs[0].key}`);
                            }
                        }, styles: {
                            body: {
                                padding: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                            },
                        }, children: [_jsx("div", { style: {
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: 'var(--paces-hover-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 22,
                                    color: 'var(--paces-primary)',
                                    flexShrink: 0,
                                }, children: mod.icon }), _jsxs("div", { style: { flex: 1 }, children: [_jsx(Text, { strong: true, style: { fontSize: 15, display: 'block' }, children: mod.label }), _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: [mod.docs.length, " documento", mod.docs.length !== 1 ? 's' : ''] })] }), mod.docs.length > 0 && (_jsx(RightOutlined, { style: { color: 'var(--paces-text-secondary)', fontSize: 12 } }))] }) }, mod.key))) }), totalDocs > 0 && (_jsxs("div", { style: { marginTop: 48 }, children: [_jsx(Title, { level: 3, style: { marginBottom: 16 }, children: "Documentos disponibles" }), _jsx(Row, { gutter: [12, 12], children: DOCS_INDEX.filter((m) => m.docs.length > 0).map((mod) => mod.docs.map((doc) => (_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Card, { hoverable: true, size: "small", className: "doc-recent-card", onClick: () => navigate(`/documentacion/${doc.key}`), styles: { body: { padding: '12px 16px' } }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx(FileTextOutlined, { style: { color: 'var(--paces-primary)', fontSize: 16 } }), _jsxs("div", { children: [_jsx(Text, { style: { fontSize: 13, display: 'block' }, children: doc.label }), _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: mod.label })] })] }) }) }, doc.key)))) })] }))] }));
};
export default DocWelcomePage;
