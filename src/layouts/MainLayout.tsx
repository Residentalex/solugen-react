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
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';

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
  FENP: 'Entradas de Almacén',
  FSAP: 'Salidas de Almacén',
  FDVC: 'Devolución de Compra',
  FTRP: 'Transferencia de Almacén',
  FDEV: 'Devolución de Venta',
  FPV: 'Facturas POS',
  FFAC: 'Factura Cliente',
  FRDE: 'Factura Proveedor',
  FCotizacion: 'Cotizaciones',
  FNDSUP: 'Nota Débito - CXP',
  FNDCLI: 'Nota Débito - CXC',
  FNCSUP: 'Nota Crédito - CXP',
  FNCCLI: 'Nota Crédito - CXC',
  FDBASUP: 'Distribución Balance CXP',
  FDBACLI: 'Distribución Balance CXC',
  FRI: 'Recibo Ingreso',
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

  const pantallaActual = usuario?.pantallas?.find((p: any) => p.codigo === activeModule);
  const pageTitle = pantallaActual?.nombre || pageTitles[activeModule] || activeModule || 'Dashboard';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Mi Perfil',
    },
    { type: 'divider' as const },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Configuración',
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

  const siderWidth = sidebarCollapsed ? 80 : 250;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        trigger={null}
        width={250}
        className="paces-sidebar"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 200,
          overflow: 'auto',
        }}
      >
        <div className={`sidebar-logo ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <GenesisLogo size={28} dark showText={!sidebarCollapsed} />
        </div>
        <Sidebar />
      </Sider>

      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
        <div className="paces-topbar">
          <div className="paces-topbar-left">
            <button className="paces-hamburger" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>

          <div className="paces-topbar-right">
            {sucursalesPermitidas.length > 1 && activeModule !== 'MUsuario' && activeModule !== 'CFacturasElectronicas' && (
              <Select
                value={sucursalActiva}
                onChange={(val) => setSucursalActiva(val)}
                disabled={isDetailPage}
                size="small"
                className="paces-sucursal-select"
                style={{ width: 180 }}
                options={sucursalesPermitidas.map((s: any) => ({
                  value: s.sucursal,
                  label: s.nombre,
                }))}
              />
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="paces-topbar-user">
                <div className="paces-avatar">
                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="paces-topbar-user-name">
                  {usuario?.nombre || usuario?.nombreUsuario || 'Usuario'}
                </span>
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="paces-page-header">
          <div className="paces-page-header-inner">
            <div>
              <h3>{pageTitleOverride || pageTitle}</h3>
              <div className="breadcrumb">
                <span>Inicio</span>
                <span style={{ color: '#6c757d' }}>/</span>
                <span>{pageTitle}</span>
              </div>
            </div>
          </div>
        </div>

        <Toolbar />

        <div className="paces-content">
          {loading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#6c757d' }}>Cargando configuración inicial...</div>
            </div>
          )}
          {!loading && <Outlet />}
        </div>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
