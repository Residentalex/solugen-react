import React, { useState, useEffect } from 'react';
import { Layout, Menu, Input, Button, Typography, Drawer } from 'antd';
import {
  BookOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import DOCS_INDEX from '../../docs/index';
import DocContent from './DocContent';
import DocTOC from './DocTOC';
import type { TocHeading } from './DocTOC';
import DocWelcomePage from './DocWelcomePage';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const DocumentacionPage: React.FC = () => {
  const { modulo, doc } = useParams<{ modulo?: string; doc?: string }>();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const hasDoc = Boolean(modulo && doc);

  // Determinar documento activo
  useEffect(() => {
    if (modulo && doc) {
      setSelectedKeys([`${modulo}/${doc}`]);
    } else {
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

  const handleDocClick = ({ key }: { key: string }) => {
    const [modSlug, docSlug] = key.split('/');
    navigate(`/documentacion/${modSlug}/${docSlug}`);
    setDrawerOpen(false);
  };

  // Filtro de búsqueda en el menú
  const filteredMenuItems = searchQuery
    ? menuItems
        .map((mod) => ({
          ...mod,
          children: mod.children?.filter((d) =>
            d.label.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((mod) => mod.children && mod.children.length > 0)
    : menuItems;

  const sidebarContent = (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--paces-text-secondary)' }} />}
          placeholder="Filtrar documentos..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={DOCS_INDEX.map((m) => m.key)}
        items={filteredMenuItems}
        onClick={handleDocClick}
        style={{ border: 'none', background: 'transparent' }}
        className="docs-sidebar-menu"
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--paces-bg-layout)' }}>
      {/* Topbar */}
      <Header
        style={{
          background: 'var(--paces-bg-container)',
          borderBottom: '1px solid var(--paces-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <BookOutlined style={{ fontSize: 20, color: 'var(--paces-primary)', marginRight: 8 }} />
        <Text strong style={{ fontSize: 16, marginRight: 24 }}>
          Solugen Docs
        </Text>

        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar en la documentación..."
          style={{ width: 320, marginRight: 'auto', maxWidth: '100%' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />

        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{ marginLeft: 16 }}
        >
          Volver al ERP
        </Button>

        {/* Botón hamburger para mobile */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          className="docs-mobile-menu-btn"
          onClick={() => setDrawerOpen(true)}
        />
      </Header>

      <Layout style={{ flex: 1 }}>
        {/* Sidebar índice (desktop) */}
        <Sider
          width={260}
          className="docs-sidebar"
          style={{
            background: 'var(--paces-bg-container)',
            borderRight: '1px solid var(--paces-border)',
          }}
        >
          {sidebarContent}
        </Sider>

        {/* Drawer para mobile/tablet */}
        <Drawer
          title="Documentación"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          styles={{ wrapper: { width: 280 } }}
        >
          {sidebarContent}
        </Drawer>

        {/* Contenido */}
        <Content style={{ padding: '40px 48px', maxWidth: 780, margin: '0 auto', width: '100%', minWidth: 0 }}>
          {hasDoc ? (
            <DocContent modulo={modulo!} doc={doc!} onHeadings={setHeadings} />
          ) : (
            <DocWelcomePage />
          )}
        </Content>

        {/* TOC - Solo visible en desktop cuando hay un documento */}
        {hasDoc && (
          <div className="doc-toc-column">
            <DocTOC headings={headings} />
          </div>
        )}
      </Layout>
    </Layout>
  );
};

export default DocumentacionPage;
