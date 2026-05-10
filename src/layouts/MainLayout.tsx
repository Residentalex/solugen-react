import React, { useEffect } from 'react';
import { Layout, Spin, message, Dropdown, Select } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Sucursal } from '../types/auth';
import { useCompanyStore } from '../stores/companyStore';
import { useUIStore } from '../stores/uiStore';
import GenesisLogo from '../components/GenesisLogo';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import { Outlet } from 'react-router-dom';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const pageTitles: Record<string, string> = {
  Dashboard: 'Dashboard',
  MUsuario: 'Usuarios',
  MROL: 'Roles',
  MSucursal: 'Sucursales',
  MProducto: 'Productos',
  MAlmacen: 'Almacenes',
  MCliente: 'Clientes',
  MSUP: 'Proveedores',
  FORC: 'Orden de Compra',
  FFAC: 'Facturas Cliente',
  FENP: 'Entradas de Almacén',
  FSAP: 'Salidas de Almacén',
  FDVC: 'Devolución de Compra',
  FTRP: 'Transferencia de Almacén',
  FDEV: 'Devolución de Venta',
  FCotizacion: 'Cotizaciones',
  MConcepto: 'Conceptos',
  MDocumento: 'Documentos',
  MCuentaContable: 'Cuentas Contables',
  FAsientoContable: 'Asientos Contables',
};

const MainLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((s: any) => s.isAuthenticated);
  const logout = useAuthStore((s: any) => s.logout);
  const usuario = useAuthStore((s: any) => s.usuario);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const sucursalesPermitidas = useAuthStore((s: any) => s.sucursalesPermitidas);
  const setSucursalActiva = useAuthStore((s: any) => s.setSucursalActiva);
  const navigate = useNavigate();
  const location = useLocation();
  const isDetailPage = /^\/[A-Za-z]+\/\d+$/.test(location.pathname);
  const { data, loading, error, fetchInitialConfig } = useCompanyStore();
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s: any) => s.setSidebarCollapsed);
  const activeModule = useUIStore((s: any) => s.activeModule);
  const pageTitleOverride = useUIStore((s: any) => s.pageTitleOverride);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && usuario?.debeCambiarClave) {
      navigate('/cambiar-clave', { replace: true });
    }
  }, [isAuthenticated, usuario?.debeCambiarClave, navigate]);

  useEffect(() => {
    if (isAuthenticated && !data.familias.length) {
      fetchInitialConfig(sucursalActiva, Sucursal.Consolidado);
    }
  }, [isAuthenticated, data.familias.length, fetchInitialConfig]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1600 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  if (!isAuthenticated) return null;

  const pageTitle = pageTitles[activeModule] || activeModule || 'Dashboard';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Mi Perfil',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      danger: true,
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        trigger={null}
        width={250}
        style={{
          background: '#fff',
          borderRight: '1px solid #e9ecef',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'auto',
        }}
      >
        <div className={`sidebar-logo ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <GenesisLogo size={28} color="#343a40" showText={!sidebarCollapsed} />
        </div>
        <Sidebar />
      </Sider>

      <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>

          <div className="topbar-right">
            {sucursalesPermitidas.length > 1 && (
              <Select
                value={sucursalActiva}
                onChange={(val) => setSucursalActiva(val)}
                disabled={isDetailPage}
                size="small"
                style={{ width: 180 }}
                options={sucursalesPermitidas.map((s: any) => ({
                  value: s.sucursal,
                  label: s.nombre,
                }))}
              />
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="topbar-user">
                <div className="avatar-placeholder">
                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="topbar-user-name">
                  {usuario?.nombreUsuario || 'Usuario'}
                </span>
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="page-header">
          <h3>{pageTitleOverride || pageTitle}</h3>
          <div className="breadcrumb">
            {activeModule ? pageTitle : 'Dashboard'}
          </div>
        </div>

        <Toolbar />

        <div className="content-area">
          {loading && (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" />
              <div style={{ marginTop: 12, color: '#666' }}>Cargando configuración inicial...</div>
            </div>
          )}
          {!loading && <Outlet />}
        </div>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
