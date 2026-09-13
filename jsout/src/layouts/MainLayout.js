import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Layout, Spin, message, Dropdown, Select, Input, Tag, Grid } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Sucursal } from '../types/auth';
import { useCompanyStore } from '../stores/companyStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificacionesStore } from '../stores/notificacionesStore';
import { useChatStore } from '../stores/chatStore';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import EntidadImagen from '../components/EntidadImagen';
import GenesisLogo from '../components/GenesisLogo';
import Sidebar from './Sidebar';
import SidebarDocBtn from '../components/SidebarDocBtn';
import Toolbar from './Toolbar';
import ThemeSwitcher from '../components/ThemeSwitcher';
import NotificacionDropdown from '../components/NotificacionDropdown';
import BuscadorGlobalModal from '../components/BuscadorGlobal/BuscadorGlobalModal';
import { Outlet } from 'react-router-dom';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined, SettingOutlined, SearchOutlined, } from '@ant-design/icons';
function toTitleCase(str) {
    if (!str)
        return '';
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
const { Sider } = Layout;
const { useBreakpoint } = Grid;
const pageTitles = {
    Dashboard: 'Dashboard',
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
    MApiToken: 'API Tokens',
};
const MainLayout = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const usuario = useAuthStore((s) => s.usuario);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
    const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
    const navigate = useNavigate();
    const location = useLocation();
    const isDetailPage = /^\/[A-Za-z]+\/\d+$/.test(location.pathname);
    const isFormPage = /^\/[A-Za-z]+\/(nuevo|\d+\/editar)$/.test(location.pathname);
    const { data, loading, error, fetchInitialConfig } = useCompanyStore();
    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
    const activeModule = useUIStore((s) => s.activeModule);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const pageTitleOverride = useUIStore((s) => s.pageTitleOverride);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const themeName = useUIStore((s) => s.themeName);
    const screens = useBreakpoint();
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
        if (error)
            message.error(error);
    }, [error]);
    // Limpiar pageTitleOverride en cada cambio de ruta
    useEffect(() => {
        setPageTitleOverride('');
    }, [location.pathname, setPageTitleOverride]);
    // Sincronizar activeModule desde la ruta actual
    useEffect(() => {
        const segmentos = location.pathname.split('/').filter(Boolean);
        if (segmentos.length > 0) {
            const codigo = segmentos[0];
            // Solo sincronizar si es un código de módulo (no rutas tipo /saas, /store, /documentacion)
            if (codigo && !['saas', 'store', 'documentacion'].includes(codigo)) {
                setActiveModule(codigo);
            }
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
        if (!isAuthenticated)
            return;
        let activo = true;
        const cargarNotificaciones = async () => {
            try {
                await useNotificacionesStore.getState().cargarPendientes();
            }
            catch {
                // Si falla la carga inicial, no bloquear la conexión SignalR
            }
            if (activo) {
                await useNotificacionesStore.getState().conectarSignalR();
                // Recargar después de conectar SignalR para asegurar datos frescos
                if (activo) {
                    try {
                        await useNotificacionesStore.getState().cargarPendientes();
                    }
                    catch {
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
    // Chat: conexion SignalR
    useEffect(() => {
        if (!isAuthenticated)
            return;
        useChatStore.getState().conectarSignalR();
        useChatStore.getState().cargarConversaciones();
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
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    if (!isAuthenticated)
        return null;
    const pantallaActual = usuario?.pantallas?.find((p) => p.codigo?.toUpperCase() === activeModule?.toUpperCase());
    const pageTitle = pantallaActual?.nombre || pageTitles[activeModule] || activeModule || 'Dashboard';
    // Filtrar sucursales: si la pantalla tiene sucursalesAutorizadas, usarlas; si no, mostrar todas
    const sucursalesFiltradas = pantallaActual?.sucursalesAutorizadas?.length
        ? sucursalesPermitidas.filter((s) => pantallaActual.sucursalesAutorizadas.some((sa) => sa.sucursal === s.sucursal))
        : sucursalesPermitidas;
    // Si la sucursal activa no está en las filtradas, cambiar a la primera disponible
    React.useEffect(() => {
        if (sucursalesFiltradas.length > 0 &&
            !sucursalesFiltradas.some((s) => s.sucursal === sucursalActiva)) {
            setSucursalActiva(sucursalesFiltradas[0].sucursal);
        }
    }, [activeModule, sucursalesFiltradas, sucursalActiva, setSucursalActiva]);
    const handleMenuClick = ({ key }) => {
        if (key === 'profile')
            navigate('/MPerfil');
        if (key === 'logout') {
            logout();
            navigate('/login');
        }
    };
    const userMenuItems = [
        {
            key: 'profile',
            icon: _jsx(UserOutlined, {}),
            label: 'Mi Perfil',
        },
        { type: 'divider' },
        {
            key: 'settings',
            icon: _jsx(SettingOutlined, {}),
            label: 'Configuración',
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: _jsx(LogoutOutlined, {}),
            label: 'Cerrar Sesión',
            danger: true,
        },
    ];
    const siderWidth = sidebarCollapsed ? 80 : 250;
    return (_jsxs(Layout, { style: { minHeight: '100vh' }, children: [_jsxs(Sider, { collapsible: true, collapsed: sidebarCollapsed, onCollapse: setSidebarCollapsed, trigger: null, width: 250, className: "paces-sidebar", style: {
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 200,
                }, children: [_jsx("div", { className: `sidebar-logo ${sidebarCollapsed ? 'collapsed' : ''}`, children: _jsx(GenesisLogo, { size: 28, dark: themeName.startsWith('dark-'), showText: !sidebarCollapsed }) }), _jsx("div", { className: "sidebar-menu-wrapper", children: _jsx(Sidebar, {}) }), _jsx("div", { className: "sidebar-footer", children: _jsx(SidebarDocBtn, { collapsed: sidebarCollapsed }) })] }), _jsxs(Layout, { style: { marginLeft: siderWidth, transition: 'margin-left 0.2s' }, children: [_jsxs("div", { className: "paces-topbar", children: [_jsxs("div", { className: "paces-topbar-left", children: [_jsx("button", { className: "paces-hamburger", onClick: () => setSidebarCollapsed(!sidebarCollapsed), children: sidebarCollapsed ? _jsx(MenuUnfoldOutlined, {}) : _jsx(MenuFoldOutlined, {}) }), _jsx("div", { style: { cursor: 'pointer', position: 'relative', width: '100%' }, onClick: () => setSearchOpen(true), children: _jsx(Input.Search, { placeholder: "Buscar...  (Ctrl+K)", size: "middle", className: "paces-topbar-search", onFocus: (e) => { e.target.blur(); setSearchOpen(true); }, onSearch: () => setSearchOpen(true) }) })] }), _jsxs("div", { className: "paces-topbar-right", children: [_jsx(ThemeSwitcher, {}), _jsx(NotificacionDropdown, {}), sucursalesFiltradas.length > 1 && activeModule !== 'dashboard' && activeModule !== 'MUsuario' && activeModule !== 'MPerfil' && activeModule !== 'CFacturasElectronicas' && activeModule !== 'ORepostear' && activeModule !== 'MTicket' && activeModule !== 'notificaciones' && activeModule !== 'MProducto' && (_jsx(Select, { value: sucursalActiva, onChange: (val) => setSucursalActiva(val), disabled: isDetailPage || isFormPage, size: "small", className: "paces-sucursal-select", options: sucursalesFiltradas.map((s) => ({
                                            value: s.sucursal,
                                            label: s.nombre,
                                        })) })), _jsx(Dropdown, { menu: { items: userMenuItems, onClick: handleMenuClick }, placement: "bottomRight", trigger: ['click'], children: _jsxs("div", { className: "paces-topbar-user", children: [_jsx(EntidadImagen, { tipo: "USUARIO", entidadID: usuario?.id ?? 0, fallback: usuario?.nombre?.charAt(0)?.toUpperCase() || 'U', size: 32, className: "paces-avatar" }), _jsx("span", { className: "paces-topbar-user-name", children: toTitleCase(usuario?.nombre) || usuario?.nombreUsuario || 'Usuario' })] }) })] })] }), _jsx("div", { className: "paces-page-header", children: _jsx("div", { className: "paces-page-header-inner", children: _jsxs("div", { children: [_jsx("h3", { children: pageTitleOverride || toTitleCase(pageTitle) }), _jsxs("div", { className: "breadcrumb", children: [_jsx("span", { children: "Inicio" }), pantallaActual?.modulos?.[0]?.nombre && (_jsxs(_Fragment, { children: [_jsx("span", { className: "paces-text-secondary", children: "/" }), _jsx("span", { children: pantallaActual.modulos[0].nombre })] })), _jsx("span", { className: "paces-text-secondary", children: "/" }), _jsx("span", { children: toTitleCase(pageTitle) })] })] }) }) }), _jsx(Toolbar, {}), _jsxs("div", { className: "paces-content", children: [loading && (_jsxs("div", { style: { textAlign: 'center', padding: 60 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { className: "paces-text-secondary", style: { marginTop: 16 }, children: "Cargando configuraci\u00F3n inicial..." })] })), !loading && _jsx(Outlet, {})] }), _jsx(BuscadorGlobalModal, { open: searchOpen, onClose: () => setSearchOpen(false) })] }), _jsx(ChatWidget, {})] }));
};
export default MainLayout;
