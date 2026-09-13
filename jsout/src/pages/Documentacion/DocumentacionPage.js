import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Input, Button, Typography, Drawer } from 'antd';
import { BookOutlined, ArrowLeftOutlined, SearchOutlined, MenuOutlined, } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import DOCS_INDEX from '../../docs/index';
import DocContent from './DocContent';
import DocTOC from './DocTOC';
import DocWelcomePage from './DocWelcomePage';
const { Sider, Content, Header } = Layout;
const { Text } = Typography;
const DocumentacionPage = () => {
    const { modulo, doc } = useParams();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [headings, setHeadings] = useState([]);
    const hasDoc = Boolean(modulo && doc);
    // Determinar documento activo
    useEffect(() => {
        if (modulo && doc) {
            setSelectedKeys([`${modulo}/${doc}`]);
        }
        else {
            setSelectedKeys([]);
        }
    }, [modulo, doc]);
    // Construir items del menú
    const menuItems = DOCS_INDEX.map((mod) => ({
        key: mod.key,
        icon: mod.icon,
        label: mod.label,
        children: mod.docs.map((d) => ({
            key: d.key,
            label: d.label,
        })),
    }));
    const handleDocClick = ({ key }) => {
        const [modSlug, docSlug] = key.split('/');
        navigate(`/documentacion/${modSlug}/${docSlug}`);
        setDrawerOpen(false);
    };
    // Filtro de búsqueda en el menú
    const filteredMenuItems = searchQuery
        ? menuItems
            .map((mod) => ({
            ...mod,
            children: mod.children?.filter((d) => d.label.toLowerCase().includes(searchQuery.toLowerCase())),
        }))
            .filter((mod) => mod.children && mod.children.length > 0)
        : menuItems;
    const sidebarContent = (_jsxs("div", { style: { padding: '16px 0' }, children: [_jsx("div", { style: { padding: '0 16px', marginBottom: 12 }, children: _jsx(Input, { prefix: _jsx(SearchOutlined, { style: { color: 'var(--paces-text-secondary)' } }), placeholder: "Filtrar documentos...", size: "small", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), allowClear: true }) }), _jsx(Menu, { mode: "inline", selectedKeys: selectedKeys, defaultOpenKeys: DOCS_INDEX.map((m) => m.key), items: filteredMenuItems, onClick: handleDocClick, style: { border: 'none', background: 'transparent' }, className: "docs-sidebar-menu" })] }));
    return (_jsxs(Layout, { style: { minHeight: '100vh', background: 'var(--paces-bg-layout)' }, children: [_jsxs(Header, { style: {
                    background: 'var(--paces-bg-container)',
                    borderBottom: '1px solid var(--paces-border)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    height: 56,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }, children: [_jsx(BookOutlined, { style: { fontSize: 20, color: 'var(--paces-primary)', marginRight: 8 } }), _jsx(Text, { strong: true, style: { fontSize: 16, marginRight: 24 }, children: "Solugen Docs" }), _jsx(Input, { prefix: _jsx(SearchOutlined, {}), placeholder: "Buscar en la documentaci\u00F3n...", style: { width: 320, marginRight: 'auto', maxWidth: '100%' }, value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), allowClear: true }), _jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/'), style: { marginLeft: 16 }, children: "Volver al ERP" }), _jsx(Button, { type: "text", icon: _jsx(MenuOutlined, {}), className: "docs-mobile-menu-btn", onClick: () => setDrawerOpen(true) })] }), _jsxs(Layout, { style: { flex: 1 }, children: [_jsx(Sider, { width: 260, className: "docs-sidebar", style: {
                            background: 'var(--paces-bg-container)',
                            borderRight: '1px solid var(--paces-border)',
                        }, children: sidebarContent }), _jsx(Drawer, { title: "Documentaci\u00F3n", placement: "left", onClose: () => setDrawerOpen(false), open: drawerOpen, styles: { wrapper: { width: 280 } }, children: sidebarContent }), _jsx(Content, { style: { padding: '40px 48px', maxWidth: 780, margin: '0 auto', width: '100%', minWidth: 0 }, children: hasDoc ? (_jsx(DocContent, { modulo: modulo, doc: doc, onHeadings: setHeadings })) : (_jsx(DocWelcomePage, {})) }), hasDoc && (_jsx("div", { className: "doc-toc-column", children: _jsx(DocTOC, { headings: headings }) }))] })] }));
};
export default DocumentacionPage;
