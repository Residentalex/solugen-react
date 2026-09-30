import React, { useEffect, useState } from 'react';
import { Layout, Spin, message, Dropdown, Select, Input, Tag, Grid, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Sucursal, type PantallaDTO, type AuthSucursalPermitidaDTO } from '../types/auth';
import { useCompanyStore } from '../stores/companyStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import ChatInitializer from '../components/ChatWidget/ChatInitializer';
import EntidadImagen from '../components/EntidadImagen';
import GenesisLogo from '../components/GenesisLogo';
import Sidebar from './Sidebar';
import SidebarDocBtn from '../components/SidebarDocBtn';
import Toolbar from './Toolbar';
import ThemeSwitcher from '../components/ThemeSwitcher';
import IncidenciaButton from '../components/IncidenciaButton';
import NotificacionDropdown from '../components/NotificacionDropdown';
import BuscadorGlobalModal from '../components/BuscadorGlobal/BuscadorGlobalModal';
import { Outlet } from 'react-router-dom';
import {
  CalendarOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  SearchOutlined,
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
  dashboardconfig: 'Configuración de Dashboard',
  MUsuario: 'Usuarios',
  MEMP: 'Empleados',
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
  RDEV: 'Reporte Devoluciones Venta',
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
  OImportarDocBanco: 'Importar Doc. Banco',
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
  Actividades: 'Actividades',
  MApiToken: 'API Tokens',
  chat: 'Chat interno',
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
  const isFormPage = /^\/[A-Za-z]+\/(nuevo|\d+\/editar)$/.test(location.pathname);
  const { data, loading, error, fetchInitialConfig } = useCompanyStore();
  const sidebarCollapsed = useUIStore((s: any) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s: any) => s.setSidebarCollapsed);
  const activeModule = useUIStore((s: any) => s.activeModule);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const pageTitleOverride = useUIStore((s: any) => s.pageTitleOverride);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const themeName = useUIStore((s: any) => s.themeName);
  const overlayAbierto = useUIStore((s) => s.overlayAbierto);
  const setOverlayAbierto = useUIStore((s) => s.setOverlayAbierto);
  const screens = useBreakpoint();
  const esEscritorio = screens.lg !== false;
  const esCompacto = screens.lg === false;
  const hamburguesaRef = React.useRef<HTMLButtonElement>(null);
  const overflowPrevioRef = React.useRef<string | undefined>(undefined);


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
      fetchInitialConfig(Sucursal.Compra, Sucursal.Consolidado);
    }
  }, [isAuthenticated, data.familias.length, fetchInitialConfig]);

  useEffect(() => {
    if (error) message.error(error);
  }, [error]);

  // Limpiar pageTitleOverride en cada cambio de ruta
  useEffect(() => {
    setPageTitleOverride('');
  }, [location.pathname, setPageTitleOverride]);

  // Sincronizar activeModule desde la ruta actual
  useEffect(() => {
    const segmentos = location.pathname.split('/').filter(Boolean);
    if (segmentos.length === 0) {
      setActiveModule('dashboard');
      return;
    }
    const codigo = segmentos[0];
    // Solo sincronizar si es un código de módulo (no rutas tipo /saas, /store, /documentacion)
    if (codigo && !['saas', 'store', 'documentacion'].includes(codigo)) {
      setActiveModule(codigo);
    }
  }, [location.pathname, setActiveModule]);

  // Sincronizar securitySucursal desde companyStore a authStore
  useEffect(() => {
    if (data.securitySucursal) {
      useAuthStore.getState().setSecuritySucursal(data.securitySucursal);
    }
  }, [data.securitySucursal]);

  // Notificaciones: conexion SignalR y carga inicial
  useEffect(() => {
    if (!isAuthenticated) return;

    let activo = true;

    const cargarNotificaciones = async () => {
      try {
        await useNotificacionesStore.getState().cargarPendientes();
      } catch {
        // Si falla la carga inicial, no bloquear la conexión SignalR
      }
      if (activo) {
        await useNotificacionesStore.getState().conectarSignalR();
        // Recargar después de conectar SignalR para asegurar datos frescos
        if (activo) {
          try {
            await useNotificacionesStore.getState().cargarPendientes();
          } catch {
            // Silencioso
          }
        }
      }
    };

    cargarNotificaciones();

    return () => {
      activo = false;
      useNotificacionesStore.getState().desconectarSignalR();
    };
  }, [isAuthenticated]);

  // Chat: conexion SignalR centralizada en ChatInitializer
  // (compartida con SaasMainLayout para /saas/chat)

  useEffect(() => {
    setOverlayAbierto(false);
  }, [location.pathname, setOverlayAbierto]);

  useEffect(() => {
    if (!overlayAbierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlayAbierto(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overlayAbierto, setOverlayAbierto]);

  useEffect(() => {
    if (!esCompacto) setOverlayAbierto(false);
  }, [esCompacto, setOverlayAbierto]);

  useEffect(() => {
    if (!esCompacto || !overlayAbierto) return;
    overflowPrevioRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (overflowPrevioRef.current !== undefined) {
        document.body.style.overflow = overflowPrevioRef.current;
        overflowPrevioRef.current = undefined;
      }
    };
  }, [esCompacto, overlayAbierto]);

  useEffect(() => {
    if (!esCompacto || !overlayAbierto) return;

    const sidebar = document.getElementById('sidebar');
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const botonHamburguesa = hamburguesaRef.current;

    const obtenerFocusables = (): HTMLElement[] =>
      Array.from(sidebar?.querySelectorAll<HTMLElement>(selector) ?? []);

    requestAnimationFrame(() => {
      obtenerFocusables()[0]?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = obtenerFocusables();
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      const activo = document.activeElement;
      const dentro = sidebar ? sidebar.contains(activo) : false;

      if (e.shiftKey) {
        if (!dentro || activo === primero) {
          e.preventDefault();
          ultimo.focus();
        }
      } else {
        if (!dentro || activo === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      botonHamburguesa?.focus();
    };
  }, [esCompacto, overlayAbierto]);

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

  const pantallaActual: PantallaDTO | undefined = usuario?.pantallas?.find(
    (p: PantallaDTO) => p.codigo?.toUpperCase() === activeModule?.toUpperCase()
  );
  const pageTitle = pantallaActual?.nombre || pageTitles[activeModule] || activeModule || 'Dashboard';

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

  if (!isAuthenticated) return null;

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
      label: 'Configuración (próximamente)',
      disabled: true,
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
  const siderColapsado = esCompacto ? false : sidebarCollapsed;
  const menuAbierto = esCompacto ? overlayAbierto : !sidebarCollapsed;
  const menuLabel = menuAbierto ? 'Cerrar menú' : 'Abrir menú';

  const toggleMenu = () => {
    if (esEscritorio) {
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setOverlayAbierto((v) => !v);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {(!esCompacto || overlayAbierto) && (
        <Sider
          collapsible
          collapsed={siderColapsado}
          onCollapse={setSidebarCollapsed}
          trigger={null}
          width={250}
          id="sidebar"
          className="paces-sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100vh',
            zIndex: esCompacto ? 300 : 200,
            boxShadow: esCompacto ? '0 0 24px rgba(0,0,0,0.18)' : undefined,
          }}
        >
          <div className={`sidebar-logo ${siderColapsado ? 'collapsed' : ''}`}>
            <GenesisLogo size={28} dark={themeName.startsWith('dark-')} showText={!siderColapsado} />
          </div>
          <div className="sidebar-menu-wrapper">
            <Sidebar />
          </div>
          <div className="sidebar-footer">
            <SidebarDocBtn collapsed={siderColapsado} />
          </div>
        </Sider>
      )}

      {esCompacto && overlayAbierto && (
        <div
          aria-hidden="true"
          onClick={() => setOverlayAbierto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 250,
          }}
        />
      )}

      <Layout style={{ marginLeft: esEscritorio ? siderWidth : 0, transition: 'margin-left 0.2s' }}>
        <div className="paces-topbar">
          <div className="paces-topbar-left">
            <Tooltip title={menuLabel}>
              <button
                ref={hamburguesaRef}
                className="paces-hamburger"
                aria-label={menuLabel}
                aria-expanded={menuAbierto}
                aria-controls="sidebar"
                onClick={toggleMenu}
              >
                {menuAbierto ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              </button>
            </Tooltip>
            <div style={{ cursor: 'pointer', position: 'relative', width: '100%' }} onClick={() => setSearchOpen(true)}>
              <Input.Search
                placeholder="Buscar...  (Ctrl+K)"
                size="middle"
                className="paces-topbar-search"
                readOnly
                role="searchbox"
                aria-label="Búsqueda global. Abrir búsqueda"
                onPressEnter={() => setSearchOpen(true)}
                onSearch={() => setSearchOpen(true)}
              />
            </div>
          </div>

          <div className="paces-topbar-right">
            <ThemeSwitcher />
            <IncidenciaButton moduloActual={pageTitle} />
            <NotificacionDropdown />
            <button
              className="paces-topbar-action-btn"
              title="Actividades"
              aria-label="Actividades"
              onClick={() => navigate('/Actividades')}
            >
              <CalendarOutlined style={{ fontSize: 16 }} />
            </button>
            {sucursalesFiltradas.length > 1 && activeModule !== 'dashboard' && activeModule !== 'MUsuario' && activeModule !== 'MPerfil' && activeModule !== 'CFacturasElectronicas' && activeModule !== 'ORepostear' && activeModule !== 'MTicket' && activeModule !== 'notificaciones' && activeModule !== 'MProducto' && activeModule !== 'chat' && activeModule !== 'Actividades' && (
              <Select
                value={sucursalActiva}
                onChange={(val) => setSucursalActiva(val)}
                disabled={isDetailPage || isFormPage}
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
                <EntidadImagen
                  tipo="USUARIO"
                  entidadID={usuario?.id ?? 0}
                  fallback={usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                  size={32}
                  className="paces-avatar"
                />
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
                <Link to="/">Inicio</Link>
                {pantallaActual?.modulos?.[0]?.nombre && (
                  <>
                    <span className="paces-text-secondary">/</span>
                    <span className="paces-text-secondary">{pantallaActual.modulos[0].nombre}</span>
                  </>
                )}
                <span className="paces-text-secondary">/</span>
                <span className="paces-text-secondary">{toTitleCase(pageTitle)}</span>
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

      {location.pathname !== '/chat' && <ChatWidget />}
      <ChatInitializer />
    </Layout>
  );
};

export default MainLayout;
