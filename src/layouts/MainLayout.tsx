import React, { useEffect, useState } from 'react';
import { Layout, Spin, message, Dropdown, Select, Input, Tag, Grid } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Sucursal, type AuthSucursalPermitidaDTO, type PantallaDTO } from '../types/auth';
import { useCompanyStore } from '../stores/companyStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import { useChatStore } from '../stores/chatStore';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import GenesisLogo from '../components/GenesisLogo';
import Sidebar from './Sidebar';
import SidebarDocBtn from '../components/SidebarDocBtn';
import Toolbar from './Toolbar';
import ThemeSwitcher from '../components/ThemeSwitcher';
import NotificacionDropdown from '../components/NotificacionDropdown';
import BuscadorGlobalModal from '../components/BuscadorGlobal/BuscadorGlobalModal';
import { Outlet } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';

function toTitleCase(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const { Sider } = Layout;
const { useBreakpoint } = Grid;

const pageTitles: Record<string, string> = {
  Dashboard: 'Dashboard',
  MUsuario: 'Usuarios',
  MROL: 'Roles',
  MSucursal: 'Sucursales',
  MServidor: 'Servidores',
  MPermiso: 'Permisos',
  MAuditoria: 'Historial y Auditoría',
  MEmpresa: 'Configuración de la Empresa',
  MTerminal: 'Terminales',
  MSincronizacion: 'Sincronización',
  MProducto: 'Productos',
  MAlmacen: 'Almacenes',
  MCliente: 'Clientes',
  MSUP: 'Proveedores',
  FORC: 'Orden de Compra',
  FENP: 'Entradas de Almacén',
  FSAP: 'Salidas de Almacén',
  FSORC: 'Solicitud de Compra',
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
  MProveedor: 'Proveedores',
  MBanco: 'Bancos',
  FOfertas: 'Ofertas',
  MCuentaBancaria: 'Cuentas Bancarias',
  MCuentaBanco: 'Cuentas Bancarias',
  MMedida: 'Unidades de Medida',
  MUnidadMedida: 'Unidades de Medida',
  MCategoriaArticulo: 'Categorías de Artículos',
  MCategoria: 'Categorías de Artículos',
  MPerfil: 'Mi Perfil',
  MFamilia: 'Familias de Artículos',
  MSecuenciaNCF: 'Secuencias NCF',
  FSPA: 'Solicitud de Pago',
  MMarca: 'Marcas',
  MAtributo: 'Atributos',
  MPaquete: 'Paquetes',
  RCIERREFISCAL: 'Cierre Fiscal',
  OPROCESOS: 'Procesos Contables',
  MAutomatizacion: 'Automatizaciones',
  MReceta: 'Recetas',
  MServicio: 'Servicios',
  FActPrecio: 'Actualización de Precios',
  FTarifas: 'Tarifas',
  CCUADRECAJA: 'Cuadre de Caja',
  CCENTRALSUPERVISION: 'Central de Supervisión',
  FTURNOS: 'Turnos',
  FPRODPEND: 'Productos Pendientes',
  OPROCESARCONTEO: 'Procesar Conteos',
  FConteos: 'Listado de Conteos',
  CMovimientosProductos: 'Movimientos de Productos',
  CDocRevisados: 'Documentos Revisados',
  OImportarINV: 'Importar Inventario',
  OActualizacionCostos: 'Actualización de Costos',
  OCierreINV: 'Cierre de Inventario',
  OCierreMes: 'Cierre de Mes',
  MPantalla: 'Pantallas',
  MPOS: 'Puntos de Venta',
  MAccion: 'Acciones',
  MPlanPago: 'Planes de Pago',
  MMetodosPago: 'Métodos de Pago',
  MImpuesto: 'Impuestos',
  MMoneda: 'Monedas',
  MTipoCuenta: 'Tipos de Cuenta',
  CFacturasElectronicas: 'Facturas Electrónicas',
  ORepostear: 'Repostear Documentos',
  FGORC: 'Generador ORC',
  notificaciones: 'Notificaciones',
  MTicket: 'Tickets',
  MApiToken: 'API Tokens',
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
  const themeName = useUIStore((s: any) => s.themeName);
  const screens = useBreakpoint();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeBreakpoint = (Object.entries(screens).find(([, v]) => v)?.[0] || 'xs') as string;

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

  // Notificaciones: conexion SignalR y carga inicial
  useEffect(() => {
    if (!isAuthenticated) return;

    let activo = true;

    const cargarNotificaciones = async () => {
      useNotificacionesStore.getState().cargarPendientes();
      if (activo) {
        await useNotificacionesStore.getState().conectarSignalR();
      }
    };

    cargarNotificaciones();

    return () => {
      activo = false;
      useNotificacionesStore.getState().desconectarSignalR();
    };
  }, [isAuthenticated]);

  // Chat: conexion SignalR
  useEffect(() => {
    if (!isAuthenticated) return;

    useChatStore.getState().conectarSignalR();

    return () => {
      useChatStore.getState().desconectarSignalR();
    };
  }, [isAuthenticated]);

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

  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) return null;

  const pantallaActual: PantallaDTO | undefined = usuario?.pantallas?.find(
    (p: PantallaDTO) => p.codigo?.toUpperCase() === activeModule?.toUpperCase()
  );
  const pageTitle = pantallaActual?.nombre || pageTitles[activeModule] || activeModule || 'Dashboard';

  // Filtrar sucursales: si la pantalla tiene sucursalesAutorizadas, usarlas; si no, mostrar todas
  const sucursalesFiltradas = pantallaActual?.sucursalesAutorizadas?.length
    ? sucursalesPermitidas.filter((s: AuthSucursalPermitidaDTO) =>
        pantallaActual!.sucursalesAutorizadas!.some((sa: AuthSucursalPermitidaDTO) => sa.sucursal === s.sucursal)
      )
    : sucursalesPermitidas;

  // Si la sucursal activa no está en las filtradas, cambiar a la primera disponible
  React.useEffect(() => {
    if (sucursalesFiltradas.length > 0 &&
        !sucursalesFiltradas.some((s: AuthSucursalPermitidaDTO) => s.sucursal === sucursalActiva)) {
      setSucursalActiva(sucursalesFiltradas[0].sucursal);
    }
  }, [activeModule, sucursalesFiltradas, sucursalActiva, setSucursalActiva]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') navigate('/MPerfil');
    if (key === 'logout') { logout(); navigate('/login'); }
  };

  const userMenuItems: MenuProps['items'] = [
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
        }}
      >
        <div className={`sidebar-logo ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <GenesisLogo size={28} dark={themeName.startsWith('dark-')} showText={!sidebarCollapsed} />
        </div>
        <div className="sidebar-menu-wrapper">
          <Sidebar />
        </div>
        <div className="sidebar-footer">
          <SidebarDocBtn collapsed={sidebarCollapsed} />
        </div>
      </Sider>

      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
        <div className="paces-topbar">
          <div className="paces-topbar-left">
            <button className="paces-hamburger" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <div style={{ cursor: 'pointer', position: 'relative', width: '100%' }} onClick={() => setSearchOpen(true)}>
              <Input.Search
                placeholder="Buscar...  (Ctrl+K)"
                size="middle"
                className="paces-topbar-search"
                onFocus={(e) => { e.target.blur(); setSearchOpen(true); }}
                onSearch={() => setSearchOpen(true)}
              />
            </div>
          </div>

          <div className="paces-topbar-right">
            <Tag style={{ marginRight: 8, fontSize: 11, lineHeight: '20px', height: 24 }}>{windowWidth}px · {activeBreakpoint}</Tag>
            <ThemeSwitcher />
            <NotificacionDropdown />
            {sucursalesFiltradas.length > 1 && activeModule !== 'MUsuario' && activeModule !== 'MPerfil' && activeModule !== 'CFacturasElectronicas' && activeModule !== 'ORepostear' && activeModule !== 'MTicket' && activeModule !== 'notificaciones' && (
              <Select
                value={sucursalActiva}
                onChange={(val) => setSucursalActiva(val)}
                disabled={isDetailPage}
                size="small"
                className="paces-sucursal-select"
                options={sucursalesFiltradas.map((s: AuthSucursalPermitidaDTO) => ({
                  value: s.sucursal,
                  label: s.nombre,
                }))}
              />
            )}
            <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight" trigger={['click']}>
              <div className="paces-topbar-user">
                <div className="paces-avatar">
                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="paces-topbar-user-name">
                  {toTitleCase(usuario?.nombre) || usuario?.nombreUsuario || 'Usuario'}
                </span>
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="paces-page-header">
          <div className="paces-page-header-inner">
            <div>
              <h3>{pageTitleOverride || toTitleCase(pageTitle)}</h3>
              <div className="breadcrumb">
                <span>Inicio</span>
                {pantallaActual?.modulos?.[0]?.nombre && (
                  <>
                    <span className="paces-text-secondary">/</span>
                    <span>{pantallaActual.modulos[0].nombre}</span>
                  </>
                )}
                <span className="paces-text-secondary">/</span>
                <span>{toTitleCase(pageTitle)}</span>
              </div>
            </div>
          </div>
        </div>

        <Toolbar />

        <div className="paces-content">
          {loading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" />
              <div className="paces-text-secondary" style={{ marginTop: 16 }}>Cargando configuración inicial...</div>
            </div>
          )}
          {!loading && <Outlet />}
        </div>

        <BuscadorGlobalModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      </Layout>

      <ChatWidget />
    </Layout>
  );
};

export default MainLayout;
