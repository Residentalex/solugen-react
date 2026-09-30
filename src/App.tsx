import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Spin } from 'antd';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login/Login';
const CambiarClave = React.lazy(() => import('./pages/CambiarClave/CambiarClave'));
import MainLayout from './layouts/MainLayout';
import SaasMainLayout from './layouts/SaasMainLayout';
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const ConfiguracionDashboard = React.lazy(() => import('./pages/Dashboard/ConfiguracionDashboard'));
const EntradaAlmacen = React.lazy(() => import('./pages/EntradaAlmacen/EntradaAlmacen'));
const EntradaAlmacenDetalle = React.lazy(() => import('./pages/EntradaAlmacen/EntradaAlmacenDetalle'));
const EntradaAlmacenFormulario = React.lazy(() => import('./pages/EntradaAlmacen/EntradaAlmacenFormulario'));
const SalidaAlmacen = React.lazy(() => import('./pages/SalidaAlmacen/SalidaAlmacen'));
const SalidaAlmacenDetalle = React.lazy(() => import('./pages/SalidaAlmacen/SalidaAlmacenDetalle'));
const SalidaAlmacenFormulario = React.lazy(() => import('./pages/SalidaAlmacen/SalidaAlmacenFormulario'));
const DevolucionCompra = React.lazy(() => import('./pages/DevolucionCompra/DevolucionCompra'));
const DevolucionCompraDetalle = React.lazy(() => import('./pages/DevolucionCompra/DevolucionCompraDetalle'));
const DevolucionCompraFormulario = React.lazy(() => import('./pages/DevolucionCompra/DevolucionCompraFormulario'));
const TransferenciaAlmacen = React.lazy(() => import('./pages/TransferenciaAlmacen/TransferenciaAlmacen'));
const TransferenciaAlmacenDetalle = React.lazy(() => import('./pages/TransferenciaAlmacen/TransferenciaAlmacenDetalle'));
const TransferenciaAlmacenFormulario = React.lazy(() => import('./pages/TransferenciaAlmacen/TransferenciaAlmacenFormulario'));
const DevolucionVenta = React.lazy(() => import('./pages/DevolucionVenta/DevolucionVenta'));
const DevolucionVentaDetalle = React.lazy(() => import('./pages/DevolucionVenta/DevolucionVentaDetalle'));
const DevolucionVentaFormulario = React.lazy(() => import('./pages/DevolucionVenta/DevolucionVentaFormulario'));
const ReporteDevolucionVenta = React.lazy(() => import('./pages/ReporteDevolucionVenta/ReporteDevolucionVenta'));
const GeneradorOrdenCompraReporte = React.lazy(() => import('./pages/GeneradorOrdenCompraReporte/GeneradorOrdenCompraReporte'));
const CotizacionVenta = React.lazy(() => import('./pages/CotizacionVenta/CotizacionVenta'));
const CotizacionVentaDetalle = React.lazy(() => import('./pages/CotizacionVenta/CotizacionVentaDetalle'));
const CotizacionVentaFormulario = React.lazy(() => import('./pages/CotizacionVenta/CotizacionVentaFormulario'));
const FacturaPOS = React.lazy(() => import('./pages/FacturaPOS/FacturaPOS'));
const FacturaPOSDetalle = React.lazy(() => import('./pages/FacturaPOS/FacturaPOSDetalle'));
const FacturaPOSFormulario = React.lazy(() => import('./pages/FacturaPOS/FacturaPOSFormulario'));
const FacturaCliente = React.lazy(() => import('./pages/FacturaCliente/FacturaCliente'));
const FacturaClienteDetalle = React.lazy(() => import('./pages/FacturaCliente/FacturaClienteDetalle'));
const FacturaClienteFormulario = React.lazy(() => import('./pages/FacturaCliente/FacturaClienteFormulario'));
const FacturaSuplidor = React.lazy(() => import('./pages/FacturaSuplidor/FacturaSuplidor'));
const FacturaSuplidorDetalle = React.lazy(() => import('./pages/FacturaSuplidor/FacturaSuplidorDetalle'));
const FacturaSuplidorFormulario = React.lazy(() => import('./pages/FacturaSuplidor/FacturaSuplidorFormulario'));
const NotaDebito = React.lazy(() => import('./pages/NotaDebito/NotaDebito'));
const NotaDebitoDetalle = React.lazy(() => import('./pages/NotaDebito/NotaDebitoDetalle'));
const NotaDebitoFormulario = React.lazy(() => import('./pages/NotaDebito/NotaDebitoFormulario'));
const NotaCredito = React.lazy(() => import('./pages/NotaCredito/NotaCredito'));
const NotaCreditoDetalle = React.lazy(() => import('./pages/NotaCredito/NotaCreditoDetalle'));
const NotaCreditoFormulario = React.lazy(() => import('./pages/NotaCredito/NotaCreditoFormulario'));
const DistribucionBalance = React.lazy(() => import('./pages/DistribucionBalance/DistribucionBalance'));
const DistribucionBalanceDetalle = React.lazy(() => import('./pages/DistribucionBalance/DistribucionBalanceDetalle'));
const DistribucionBalanceFormulario = React.lazy(() => import('./pages/DistribucionBalance/DistribucionBalanceFormulario'));
const ReciboIngreso = React.lazy(() => import('./pages/ReciboIngreso/ReciboIngreso'));
const ReciboIngresoDetalle = React.lazy(() => import('./pages/ReciboIngreso/ReciboIngresoDetalle'));
const ReciboIngresoFormulario = React.lazy(() => import('./pages/ReciboIngreso/ReciboIngresoFormulario'));
const Usuarios = React.lazy(() => import('./pages/Usuarios/Usuarios'));
const UsuarioDetalle = React.lazy(() => import('./pages/Usuarios/UsuarioDetalle'));
const UsuarioFormulario = React.lazy(() => import('./pages/Usuarios/UsuarioFormulario'));
const Roles = React.lazy(() => import('./pages/Roles/Roles'));
const RolFormulario = React.lazy(() => import('./pages/Roles/RolFormulario'));
const Modulos = React.lazy(() => import('./pages/Modulos/Modulos'));
const ModuloFormulario = React.lazy(() => import('./pages/Modulos/ModuloFormulario'));
const ModuloDetalle = React.lazy(() => import('./pages/Modulos/ModuloDetalle'));
const Productos = React.lazy(() => import('./pages/Productos/Productos'));
const ProductoDetalle = React.lazy(() => import('./pages/Productos/ProductoDetalle'));
const ProductoFormulario = React.lazy(() => import('./pages/Productos/ProductoFormulario'));
const ProductosImportar = React.lazy(() => import('./pages/Productos/ProductosImportar'));
const Monedas = React.lazy(() => import('./pages/Monedas/Monedas'));
const Documentos = React.lazy(() => import('./pages/Documentos/Documentos'));
const DocumentosDetalle = React.lazy(() => import('./pages/Documentos/DocumentosDetalle'));
const DocumentosFormulario = React.lazy(() => import('./pages/Documentos/DocumentosFormulario'));
const Conceptos = React.lazy(() => import('./pages/Conceptos/Conceptos'));
const ConceptoDetalle = React.lazy(() => import('./pages/Conceptos/ConceptoDetalle'));
const ConceptoFormulario = React.lazy(() => import('./pages/Conceptos/ConceptoFormulario'));
const Pantallas = React.lazy(() => import('./pages/Pantallas/Pantallas'));
const PantallaDetalle = React.lazy(() => import('./pages/Pantallas/PantallaDetalle'));
const PantallaFormulario = React.lazy(() => import('./pages/Pantallas/PantallaFormulario'));
const TiposCuenta = React.lazy(() => import('./pages/TiposCuenta/TiposCuenta'));
const CuentasContables = React.lazy(() => import('./pages/CuentasContables/CuentasContables'));
const CuentaContableDetalle = React.lazy(() => import('./pages/CuentasContables/CuentaContableDetalle'));
const Impuestos = React.lazy(() => import('./pages/Impuestos/Impuestos'));
const AsientosContables = React.lazy(() => import('./pages/AsientosContables/AsientosContables'));
const AsientoContableDetalle = React.lazy(() => import('./pages/AsientosContables/AsientoContableDetalle'));
const AsientoContableFormulario = React.lazy(() => import('./pages/AsientosContables/AsientoContableFormulario'));
const CFacturasElectronicas = React.lazy(() => import('./pages/DGII/CFacturasElectronicas'));
const CierreFiscal = React.lazy(() => import('./pages/CierreFiscal/CierreFiscal'));
const CierreFiscalDetalle = React.lazy(() => import('./pages/CierreFiscal/CierreFiscalDetalle'));
const CierreMes = React.lazy(() => import('./pages/CierreMes/CierreMes'));
const SecuenciasNCF = React.lazy(() => import('./pages/SecuenciasNCF/SecuenciasNCF'));
const Clientes = React.lazy(() => import('./pages/Clientes/Clientes'));
const ClienteDetalle = React.lazy(() => import('./pages/Clientes/ClienteDetalle'));
const PuntosVenta = React.lazy(() => import('./pages/PuntosVenta/PuntosVenta'));
const MetodosPago = React.lazy(() => import('./pages/MetodosPago/MetodosPago'));
const Repostear = React.lazy(() => import('./pages/Repostear/Repostear'));
const Acciones = React.lazy(() => import('./pages/Acciones/Acciones'));
const PlanesPago = React.lazy(() => import('./pages/PlanesPago/PlanesPago'));
const Almacenes = React.lazy(() => import('./pages/Almacenes/Almacenes'));
const Denominaciones = React.lazy(() => import('./pages/Denominaciones/Denominaciones'));
import Proximamente from './pages/Proximamente';
const PermisosEspeciales = React.lazy(() => import('./pages/PermisosEspeciales/PermisosEspeciales'));
const OrdenCompra = React.lazy(() => import('./pages/OrdenCompra/OrdenCompra'));
const OrdenCompraDetalle = React.lazy(() => import('./pages/OrdenCompra/OrdenCompraDetalle'));
const OrdenCompraFormulario = React.lazy(() => import('./pages/OrdenCompra/OrdenCompraFormulario'));
const Proveedores = React.lazy(() => import('./pages/Proveedores/Proveedores'));
const ProveedorDetalle = React.lazy(() => import('./pages/Proveedores/ProveedorDetalle'));
const Bancos = React.lazy(() => import('./pages/Bancos/Bancos'));
const Ofertas = React.lazy(() => import('./pages/Ofertas/Ofertas'));
const CuentasBancarias = React.lazy(() => import('./pages/CuentasBancarias/CuentasBancarias'));
const FTransBanco = React.lazy(() => import('./pages/CuentasBancarias/CuentaBancariaDetalle'));
const CuentaBancariaFormulario = React.lazy(() => import('./pages/CuentasBancarias/CuentaBancariaFormulario'));
const TransaccionBancariaDetalle = React.lazy(() => import('./pages/TransaccionBancaria/TransaccionBancariaDetalle'));
const TransaccionBancariaFormulario = React.lazy(() => import('./pages/TransaccionBancaria/TransaccionBancariaFormulario'));
const UnidadesMedida = React.lazy(() => import('./pages/UnidadesMedida/UnidadesMedida'));
const CategoriasArticulo = React.lazy(() => import('./pages/CategoriasArticulo/CategoriasArticulo'));
const CategoriaArticuloDetalle = React.lazy(() => import('./pages/CategoriasArticulo/CategoriaArticuloDetalle'));
const FamiliasArticulo = React.lazy(() => import('./pages/FamiliasArticulo/FamiliasArticulo'));
const SolicitudPago = React.lazy(() => import('./pages/SolicitudPago/SolicitudPago'));
const SolicitudPagoDetalle = React.lazy(() => import('./pages/SolicitudPago/SolicitudPagoDetalle'));
const SolicitudPagoFormulario = React.lazy(() => import('./pages/SolicitudPago/SolicitudPagoFormulario'));
const Notificaciones = React.lazy(() => import('./pages/Notificaciones/Notificaciones'));
const NotificacionesConfig = React.lazy(() => import('./pages/Notificaciones/Configuracion'));
const NotificacionesPersonalizadas = React.lazy(() => import('./pages/Notificaciones/NotificacionesPersonalizadas'));
const Recetas = React.lazy(() => import('./pages/Recetas/Recetas'));
const Automatizaciones = React.lazy(() => import('./pages/Automatizaciones/Automatizaciones'));
const MiPerfil = React.lazy(() => import('./pages/MiPerfil/MiPerfil'));
const Servicios = React.lazy(() => import('./pages/Servicios/Servicios'));
const ActualizacionPrecio = React.lazy(() => import('./pages/ActualizacionPrecio/ActualizacionPrecio'));
const ActualizacionPrecioDetalle = React.lazy(() => import('./pages/ActualizacionPrecio/ActualizacionPrecioDetalle'));
const ActualizacionPrecioFormulario = React.lazy(() => import('./pages/ActualizacionPrecio/ActualizacionPrecioFormulario'));
const Turnos = React.lazy(() => import('./pages/Turnos/Turnos'));
const TurnoDetalle = React.lazy(() => import('./pages/Turnos/TurnoDetalle'));
const Conteos = React.lazy(() => import('./pages/Conteos/Conteos'));
const ConteoDetalle = React.lazy(() => import('./pages/Conteos/ConteoDetalle'));
const ConteoFisicoFormulario = React.lazy(() => import('./pages/Conteos/ConteoFisicoFormulario'));
const MovimientosProductos = React.lazy(() => import('./pages/MovimientosProductos/MovimientosProductos'));
const ImportarInventario = React.lazy(() => import('./pages/ImportarInventario/ImportarInventario'));
const ImportarDocBanco = React.lazy(() => import('./pages/ImportarDocBanco/ImportarDocBanco'));
const ActualizacionCostos = React.lazy(() => import('./pages/ActualizacionCostos/ActualizacionCostos'));
const AntiguedadSaldos = React.lazy(() => import('./pages/AntiguedadSaldos/AntiguedadSaldos'));
const DetalleSuplidor = React.lazy(() => import('./pages/AntiguedadSaldos/DetalleSuplidor'));
const AntiguedadSaldosDVC = React.lazy(() => import('./pages/AntiguedadSaldosDVC/AntiguedadSaldosDVC'));
const FacturasVencidas = React.lazy(() => import('./pages/FacturasVencidas/FacturasVencidas'));
const MayorAuxiliar = React.lazy(() => import('./pages/MayorAuxiliar/MayorAuxiliar'));
const DiarioGeneral = React.lazy(() => import('./pages/DiarioGeneral/DiarioGeneral'));
const TransaccionNoCuadrada = React.lazy(() => import('./pages/TransaccionNoCuadrada/TransaccionNoCuadrada'));
const IntegridadAsientos = React.lazy(() => import('./pages/IntegridadAsientos/IntegridadAsientos'));
const DocumentoSinAsiento = React.lazy(() => import('./pages/DocumentoSinAsiento/DocumentoSinAsiento'));
const ReporteIntegridadAuxiliares = React.lazy(() => import('./pages/ReporteIntegridadAuxiliares/ReporteIntegridadAuxiliares'));
const DocumentosAnulados = React.lazy(() => import('./pages/DocumentosAnulados/DocumentosAnulados'));
const CierreInventario = React.lazy(() => import('./pages/CierreInventario/CierreInventario'));
const CierreDetalle = React.lazy(() => import('./pages/CierreInventario/CierreDetalle'));
const GeneradorORC = React.lazy(() => import('./pages/GeneradorORC/GeneradorORC'));
const GeneradorORCDetalle = React.lazy(() => import('./pages/GeneradorORC/GeneradorORCDetalle'));
const GeneradorORCFormulario = React.lazy(() => import('./pages/GeneradorORC/GeneradorORCFormulario'));
const Rmovdoc = React.lazy(() => import('./pages/Rmovdoc/Rmovdoc'));
const RMovimientosPorFecha = React.lazy(() => import('./pages/RMovimientosPorFecha/RMovimientosPorFecha'));
const Tickets = React.lazy(() => import('./pages/Tickets/Tickets'));
const Empleados = React.lazy(() => import('./pages/Empleados/Empleados'));
const EmpleadoDetalle = React.lazy(() => import('./pages/Empleados/EmpleadoDetalle'));
const EmpleadoFormulario = React.lazy(() => import('./pages/Empleados/EmpleadoFormulario'));
const VisualizarConsulta = React.lazy(() => import('./pages/Notificaciones/VisualizarConsulta'));
const PlantillaSuplidor = React.lazy(() => import('./pages/PlantillaSuplidor/PlantillaSuplidor'));
const PlantillaSuplidorDetalle = React.lazy(() => import('./pages/PlantillaSuplidor/PlantillaSuplidorDetalle'));
const PlantillaSuplidorFormulario = React.lazy(() => import('./pages/PlantillaSuplidor/PlantillaSuplidorFormulario'));
const MovimientoPorPlantilla = React.lazy(() => import('./pages/MovimientoPorPlantilla/MovimientoPorPlantilla'));
const DocumentacionPage = React.lazy(() => import('./pages/Documentacion/DocumentacionPage'));
const RDocNoAutorizado = React.lazy(() => import('./pages/RDocNoAutorizado/RDocNoAutorizado'));
const ASPA = React.lazy(() => import('./pages/ASPA/ASPA'));
const StoreProductoDetalle = React.lazy(() => import('./pages/Ecommerce/StoreProductoDetalle'));
const HomePage = React.lazy(() => import('./pages/Ecommerce/HomePage'));
const CheckoutPage = React.lazy(() => import('./pages/Ecommerce/CheckoutPage'));
const OrdenConfirmacionPage = React.lazy(() => import('./pages/Ecommerce/OrdenConfirmacionPage'));
const OrdenesPage = React.lazy(() => import('./pages/Ecommerce/OrdenesPage'));
const LoginPage = React.lazy(() => import('./pages/Ecommerce/LoginPage'));
const RegistroPage = React.lazy(() => import('./pages/Ecommerce/RegistroPage'));
const PerfilPage = React.lazy(() => import('./pages/Ecommerce/PerfilPage'));
const EcommerceAdminDashboard = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminDashboard'));
const EcommerceAdminProductos = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminProductos'));
const EcommerceAdminCategorias = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminCategorias'));
const EcommerceAdminBanners = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminBanners'));
const EcommerceAdminOrdenes = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminOrdenes'));
const EcommerceAdminConfig = React.lazy(() => import('./pages/Ecommerce/Admin/EcommerceAdminConfig'));
const ApiTokens = React.lazy(() => import('./pages/ApiTokens/ApiTokens'));
const DocumentosAutorizados = React.lazy(() => import('./pages/DocumentosAutorizados/DocumentosAutorizados'));
const Reporte606 = React.lazy(() => import('./pages/Reporte606/Reporte606'));
const DocumentosAplicados = React.lazy(() => import('./pages/DocumentosAplicados/DocumentosAplicados'));
const DocumentosCxPAutorizados = React.lazy(() => import('./pages/DocumentosCxPAutorizados/DocumentosCxPAutorizados'));
const DocumentosCxPAplicados = React.lazy(() => import('./pages/DocumentosCxPAplicados/DocumentosCxPAplicados'));
const TransferenciaSucursales = React.lazy(() => import('./pages/TransferenciaSucursales/TransferenciaSucursales'));
const Empresa = React.lazy(() => import('./pages/Configuracion/Empresa'));
const ConciliacionBancaria = React.lazy(() => import('./pages/ConciliacionBancaria/ConciliacionBancaria'));
const ConciliacionBancariaDetalle = React.lazy(() => import('./pages/ConciliacionBancaria/ConciliacionBancariaDetalle'));
const ConciliacionBancariaFormulario = React.lazy(() => import('./pages/ConciliacionBancaria/ConciliacionBancariaFormulario'));
const ConfigPedidosYa = React.lazy(() => import('./pages/ConfigPedidosYa/ConfigPedidosYa'));
const ReportesModulo = React.lazy(() => import('./pages/ReportesModulo/ReportesModulo'));
const VisanetTest = React.lazy(() => import('./pages/VisanetTest/VisanetTest'));
const MonitoreoCajas = React.lazy(() => import('./pages/MonitoreoCajas/MonitoreoCajas'));
const ReportesConfig = React.lazy(() => import('./pages/ReportesConfig/ReportesConfig'));
const ChatPage = React.lazy(() => import('./pages/Chat/ChatPage'));
const ActividadesPage = React.lazy(() => import('./pages/Actividades/ActividadesPage'));
const ServiciosActividadPage = React.lazy(() => import('./pages/Actividades/ServiciosActividadPage'));

// Pantalla de carga mientras se descarga el chunk de la pagina (React.lazy).
const PageLoading: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
    <Spin size="large" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PantallaGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pantallas = useAuthStore((s) => s.usuario?.pantallas || []);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Extraer el código de la pantalla desde la ruta
  // Si la ruta empieza con /saas/, ignorar ese prefijo
  const segmentos = location.pathname.split('/').filter(Boolean);
  const segmentosSinSaas = segmentos[0] === 'saas' ? segmentos.slice(1) : segmentos;
  const codigoRuta = segmentosSinSaas[0] || '';
  // Para rutas multi-segmento (ej: FConcil), también verificar el path completo
  const codigoRutaCompleto = segmentosSinSaas.join('/');
  // Si viene con skipGuard, saltar la verificación de permisos
  const searchParams = new URLSearchParams(location.search);
  if (searchParams.get('skipGuard') === '1') {
    return <>{children}</>;
  }
  // El chat interno es transversal: disponible para cualquier usuario autenticado.
  if (codigoRuta && !['dashboard', 'dashboardconfig', 'cambiar-clave', 'chat', 'MPERFIL', 'MPerfil', 'notificaciones', 'MTicket', 'Actividades', 'visualizar-consulta', 'MApiToken', 'Mmodulo', 'RGORC', 'Reportes', 'TVISANET'].includes(codigoRuta) && !codigoRuta.startsWith('Reportes_')) {
    const tieneAcceso =
      pantallas.some((p) => p.codigo.toLowerCase() === codigoRuta.toLowerCase()) ||
      pantallas.some((p) => p.codigo.toLowerCase() === codigoRutaCompleto.toLowerCase()) ||
      pantallas.some((p) => p.ruta && p.ruta.toLowerCase() === ('/' + codigoRutaCompleto).toLowerCase());
    if (!tieneAcceso) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <React.Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/cambiar-clave"
          element={
            <ProtectedRoute>
              <CambiarClave />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PantallaGuard>
                <MainLayout />
              </PantallaGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboardconfig" element={<ConfiguracionDashboard />} />
            <Route path="Reportes/:modulo" element={<ReportesModulo />} />
            <Route path="FENP" element={<EntradaAlmacen />} />
            <Route path="FENP/nuevo" element={<EntradaAlmacenFormulario />} />
            <Route path="FENP/:id/editar" element={<EntradaAlmacenFormulario />} />
            <Route path="FENP/:id" element={<EntradaAlmacenDetalle />} />
            <Route path="FSAP" element={<SalidaAlmacen />} />
            <Route path="FSORC" element={<Proximamente modulo="Solicitud de Compra" codigo="FSORC" />} />
            <Route path="FSAP/nuevo" element={<SalidaAlmacenFormulario />} />
            <Route path="FSAP/:id/editar" element={<SalidaAlmacenFormulario />} />
            <Route path="FSAP/:id" element={<SalidaAlmacenDetalle />} />
           <Route path="FDVC" element={<DevolucionCompra />} />
            <Route path="FDVC/nuevo" element={<DevolucionCompraFormulario />} />
            <Route path="FDVC/:id/editar" element={<DevolucionCompraFormulario />} />
            <Route path="FDVC/:id" element={<DevolucionCompraDetalle />} />
           <Route path="FTRP" element={<TransferenciaAlmacen />} />
            <Route path="FTRP/nuevo" element={<TransferenciaAlmacenFormulario />} />
            <Route path="FTRP/:id/editar" element={<TransferenciaAlmacenFormulario />} />
            <Route path="FTRP/:id" element={<TransferenciaAlmacenDetalle />} />
            <Route path="FConcil" element={<ConciliacionBancaria />} />
            <Route path="FConcil/nuevo" element={<ConciliacionBancariaFormulario />} />
            <Route path="FConcil/:id/editar" element={<ConciliacionBancariaFormulario />} />
            <Route path="FConcil/:id" element={<ConciliacionBancariaDetalle />} />
            <Route path="FDEV" element={<DevolucionVenta />} />
            <Route path="FDEV/nuevo" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id/editar" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id" element={<DevolucionVentaDetalle />} />
            <Route path="RDEV" element={<ReporteDevolucionVenta />} />
            <Route path="R606" element={<Reporte606 />} />
            <Route path="RGORC/:idExterno" element={<GeneradorOrdenCompraReporte />} />
            <Route path="RDocAutorizado" element={<DocumentosAutorizados />} />
            <Route path="RDocAplicado" element={<DocumentosAplicados />} />
            <Route path="RDocCxPAutorizado" element={<DocumentosCxPAutorizados />} />
            <Route path="RDocCxPAplicado" element={<DocumentosCxPAplicados />} />
            <Route path="ASPA" element={<ASPA />} />
            <Route path="RDocNoAutorizado" element={<RDocNoAutorizado />} />
            <Route path="RSAPENP" element={<TransferenciaSucursales />} />
            <Route path="FCotizacion" element={<CotizacionVenta />} />
            <Route path="FCotizacion/nuevo" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id/editar" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id" element={<CotizacionVentaDetalle />} />
            <Route path="FPV" element={<FacturaPOS />} />
            <Route path="FPV/nuevo" element={<FacturaPOSFormulario />} />
            <Route path="FPV/:id/editar" element={<FacturaPOSFormulario />} />
            <Route path="FPV/:id" element={<FacturaPOSDetalle />} />
            <Route path="FFAC" element={<FacturaCliente />} />
            <Route path="FFAC/nuevo" element={<FacturaClienteFormulario />} />
            <Route path="FFAC/:id/editar" element={<FacturaClienteFormulario />} />
            <Route path="FFAC/:id" element={<FacturaClienteDetalle />} />
            <Route path="FRDE" element={<FacturaSuplidor />} />
            <Route path="FRDE/nuevo" element={<FacturaSuplidorFormulario />} />
            <Route path="FRDE/:id/editar" element={<FacturaSuplidorFormulario />} />
            <Route path="FRDE/:id" element={<FacturaSuplidorDetalle />} />
            <Route path="FNDSUP" element={<NotaDebito tipoEntidad="SUP" />} />
            <Route path="FNDSUP/nuevo" element={<NotaDebitoFormulario tipoEntidad="SUP" />} />
            <Route path="FNDSUP/:id/editar" element={<NotaDebitoFormulario tipoEntidad="SUP" />} />
            <Route path="FNDSUP/:id" element={<NotaDebitoDetalle tipoEntidad="SUP" />} />
            <Route path="FNDCLI" element={<NotaDebito tipoEntidad="CLI" />} />
            <Route path="FNDCLI/nuevo" element={<NotaDebitoFormulario tipoEntidad="CLI" />} />
            <Route path="FNDCLI/:id/editar" element={<NotaDebitoFormulario tipoEntidad="CLI" />} />
            <Route path="FNDCLI/:id" element={<NotaDebitoDetalle tipoEntidad="CLI" />} />
            <Route path="FNCSUP" element={<NotaCredito tipoEntidad="SUP" />} />
            <Route path="FNCSUP/nuevo" element={<NotaCreditoFormulario tipoEntidad="SUP" />} />
            <Route path="FNCSUP/:id/editar" element={<NotaCreditoFormulario tipoEntidad="SUP" />} />
            <Route path="FNCSUP/:id" element={<NotaCreditoDetalle tipoEntidad="SUP" />} />
            <Route path="FNCCLI" element={<NotaCredito tipoEntidad="CLI" />} />
            <Route path="FNCCLI/nuevo" element={<NotaCreditoFormulario tipoEntidad="CLI" />} />
            <Route path="FNCCLI/:id/editar" element={<NotaCreditoFormulario tipoEntidad="CLI" />} />
            <Route path="FNCCLI/:id" element={<NotaCreditoDetalle tipoEntidad="CLI" />} />
            <Route path="FDBASUP" element={<DistribucionBalance tipoEntidad="SUP" />} />
            <Route path="FDBASUP/nuevo" element={<DistribucionBalanceFormulario tipoEntidad="SUP" />} />
            <Route path="FDBASUP/:id/editar" element={<DistribucionBalanceFormulario tipoEntidad="SUP" />} />
            <Route path="FDBASUP/:id" element={<DistribucionBalanceDetalle tipoEntidad="SUP" />} />
            <Route path="FDBACLI" element={<DistribucionBalance tipoEntidad="CLI" />} />
            <Route path="FDBACLI/nuevo" element={<DistribucionBalanceFormulario tipoEntidad="CLI" />} />
            <Route path="FDBACLI/:id/editar" element={<DistribucionBalanceFormulario tipoEntidad="CLI" />} />
            <Route path="FDBACLI/:id" element={<DistribucionBalanceDetalle tipoEntidad="CLI" />} />
            <Route path="FRI" element={<ReciboIngreso />} />
            <Route path="FRI/nuevo" element={<ReciboIngresoFormulario />} />
            <Route path="FRI/:id/editar" element={<ReciboIngresoFormulario />} />
            <Route path="FRI/:id" element={<ReciboIngresoDetalle />} />
            <Route path="MUsuario" element={<Usuarios />} />
            <Route path="MUsuario/nuevo" element={<UsuarioFormulario />} />
            <Route path="MUsuario/:id/editar" element={<UsuarioFormulario />} />
            <Route path="MUsuario/:id" element={<UsuarioDetalle />} />
            <Route path="MROL" element={<Roles />} />
            <Route path="MROL/nuevo" element={<RolFormulario />} />
            <Route path="MROL/:id/editar" element={<RolFormulario />} />
            <Route path="MProducto" element={<Productos />} />
            <Route path="MProducto/nuevo" element={<ProductoFormulario />} />
            <Route path="MProducto/:codigo/editar" element={<ProductoFormulario />} />
            <Route path="MProducto/:codigo" element={<ProductoDetalle />} />
            <Route path="MProducto/importar" element={<ProductosImportar />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="MDocumento" element={<Documentos />} />
            <Route path="MDocumento/nuevo" element={<DocumentosFormulario />} />
            <Route path="MDocumento/:id/editar" element={<DocumentosFormulario />} />
            <Route path="MDocumento/:id" element={<DocumentosDetalle />} />
            <Route path="MConcepto" element={<Conceptos />} />
            <Route path="MConcepto/nuevo" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo/editar" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo" element={<ConceptoDetalle />} />
            <Route path="MAccion" element={<Acciones />} />
            <Route path="MPantalla" element={<Pantallas />} />
            <Route path="MPantalla/nuevo" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id/editar" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id" element={<PantallaDetalle />} />
            <Route path="Mmodulo" element={<Modulos />} />
            <Route path="Mmodulo/nuevo" element={<ModuloFormulario />} />
            <Route path="Mmodulo/:id" element={<ModuloDetalle />} />
            <Route path="Mmodulo/:id/editar" element={<ModuloFormulario />} />
            <Route path="MTipoCuenta" element={<TiposCuenta />} />
            <Route path="MCuentaContable" element={<CuentasContables />} />
            <Route path="MCuentaContable/:noCuenta" element={<CuentaContableDetalle />} />
            <Route path="MImpuesto" element={<Impuestos />} />
            <Route path="FAsientoContable" element={<AsientosContables />} />
            <Route path="FAsientoContable/nuevo" element={<AsientoContableFormulario />} />
            <Route path="FAsientoContable/:id/editar" element={<AsientoContableFormulario />} />
            <Route path="FAsientoContable/:id" element={<AsientoContableDetalle />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
            <Route path="MSecuenciaNCF" element={<SecuenciasNCF />} />
            <Route path="MCliente" element={<Clientes />} />
            <Route path="MCliente/nuevo" element={<ClienteDetalle />} />
            <Route path="MCliente/:codigo" element={<ClienteDetalle />} />
            <Route path="MPOS" element={<PuntosVenta />} />
            <Route path="TVISANET" element={<VisanetTest />} />
            <Route path="MMetodosPago" element={<MetodosPago />} />
            <Route path="MAlmacen" element={<Almacenes />} />
            <Route path="FDenominacion" element={<Denominaciones />} />
            <Route path="MServicio" element={<Servicios />} />
            <Route path="FActPrecio" element={<ActualizacionPrecio />} />
            <Route path="FActPrecio/nuevo" element={<ActualizacionPrecioFormulario />} />
            <Route path="FActPrecio/:id/editar" element={<ActualizacionPrecioFormulario />} />
            <Route path="FActPrecio/:id" element={<ActualizacionPrecioDetalle />} />
            <Route path="FTarifas" element={<Proximamente modulo="Tarifas" codigo="FTarifas" />} />
            <Route path="CCUADRECAJA" element={<Proximamente modulo="Cuadre de Caja" codigo="CCUADRECAJA" />} />
            <Route path="CCENTRALSUPERVISION" element={<MonitoreoCajas />} />
            <Route path="MPlanPago" element={<PlanesPago />} />
            <Route path="FORC" element={<OrdenCompra />} />
            <Route path="FORC/nuevo" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id/editar" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id" element={<OrdenCompraDetalle />} />
            <Route path="MSUP" element={<Proveedores />} />
            <Route path="MSUP/nuevo" element={<ProveedorDetalle />} />
            <Route path="MSUP/:codigo" element={<ProveedorDetalle />} />
            <Route path="MBanco" element={<Bancos />} />
            <Route path="FOfertas" element={<Ofertas />} />
            <Route path="MCuentaBanco" element={<CuentasBancarias />} />
            <Route path="MCuentaBanco/nuevo" element={<CuentaBancariaFormulario mode="crear" />} />
            <Route path="MCuentaBanco/editar/:codigo" element={<CuentaBancariaFormulario mode="editar" />} />
            <Route path="FTransBanco" element={<FTransBanco />} />
            <Route path="FTransBanco/nuevo" element={<TransaccionBancariaFormulario />} />
            <Route path="FTransBanco/:id/editar" element={<TransaccionBancariaFormulario />} />
            <Route path="FTransBanco/:id" element={<TransaccionBancariaDetalle />} />
            <Route path="MUnidadMedida" element={<UnidadesMedida />} />
            <Route path="MCategoria" element={<CategoriasArticulo />} />
            <Route path="MCategoria/:codigo" element={<CategoriaArticuloDetalle />} />
            <Route path="MFamilia" element={<FamiliasArticulo />} />
            <Route path="MMarca" element={<Proximamente modulo="Marcas" codigo="MMarca" />} />
            <Route path="MAtributo" element={<Proximamente modulo="Atributos" codigo="MAtributo" />} />
            <Route path="MPaquete" element={<Proximamente modulo="Paquetes" codigo="MPaquete" />} />
            <Route path="RCIERREFISCAL" element={<CierreFiscal />} />
            <Route path="RCIERREFISCAL/:transacId" element={<CierreFiscalDetalle />} />
            <Route path="OCierreMes" element={<CierreMes />} />
            <Route path="OPROCESOS" element={<Proximamente modulo="Procesos Contables" codigo="OPROCESOS" />} />
            <Route path="MReceta" element={<Recetas />} />
            <Route path="MAutomatizacion" element={<Automatizaciones />} />
            <Route path="MPerfil" element={<MiPerfil />} />
          <Route path="MEMP" element={<Empleados />} />
          <Route path="MEMP/nuevo" element={<EmpleadoFormulario />} />
          <Route path="MEMP/:codigo" element={<EmpleadoDetalle />} />
          <Route path="MEMP/:codigo/editar" element={<EmpleadoFormulario />} />
          <Route path="FTURNOS/:noTurno" element={<TurnoDetalle />} />
          <Route path="FTURNOS" element={<Turnos />} />
          <Route path="FConteos" element={<Conteos />} />
          <Route path="FConteos/:documento" element={<ConteoDetalle />} />
          <Route path="FConteos/editar/:documento" element={<ConteoFisicoFormulario />} />
            <Route path="CMovimientosProductos" element={<MovimientosProductos />} />
            <Route path="CDocRevisados" element={<Proximamente modulo="Documentos Revisados" codigo="CDocRevisados" />} />
            <Route path="FPRODPEND" element={<Proximamente modulo="Productos Pendientes" codigo="FPRODPEND" />} />
            <Route path="OPROCESARCONTEO" element={<Proximamente modulo="Procesar Conteos" codigo="OPROCESARCONTEO" />} />
          <Route path="OReglasAbastecimiento" element={<Proximamente modulo="Reglas de Abastecimiento" codigo="OReglasAbastecimiento" />} />
          <Route path="FSPA" element={<SolicitudPago />} />
          <Route path="FSPA/nuevo" element={<SolicitudPagoFormulario />} />
          <Route path="FSPA/:id/editar" element={<SolicitudPagoFormulario />} />
          <Route path="FSPA/:id" element={<SolicitudPagoDetalle />} />
          <Route path="OImportarINV" element={<ImportarInventario />} />
          <Route path="OImportarDocBanco" element={<ImportarDocBanco />} />
          <Route path="OCierreINV" element={<CierreInventario />} />
          <Route path="OCierreINV/detalle/:cierreId" element={<CierreDetalle />} />
            <Route path="FGORC" element={<GeneradorORC />} />
            <Route path="FGORC/nuevo" element={<GeneradorORCFormulario />} />
            <Route path="FGORC/:id/editar" element={<GeneradorORCFormulario />} />
          <Route path="FGORC/:id" element={<GeneradorORCDetalle />} />
          <Route path="RMOVDOC" element={<Rmovdoc />} />
          <Route path="RMovimientosPorFecha" element={<RMovimientosPorFecha />} />
          <Route path="OActualizacionCostos" element={<ActualizacionCostos />} />
          <Route path="RAntiguedaCXC" element={<AntiguedadSaldos tipoEntidad="CLI" />} />
          <Route path="RAntiguedadCXP" element={<AntiguedadSaldos tipoEntidad="SUP" />} />
          <Route path="RAntiguedaCXC/detalle" element={<DetalleSuplidor />} />
          <Route path="RAntiguedadCXP/detalle" element={<DetalleSuplidor />} />
          <Route path="RAntiguedadSaldoDVC" element={<AntiguedadSaldosDVC />} />
          <Route path="RFACVEN" element={<FacturasVencidas />} />
            <Route path="RMayorAux" element={<MayorAuxiliar />} />
            <Route path="RDiarioGeneral" element={<DiarioGeneral />} />
            <Route path="RTransNoCuadrada" element={<TransaccionNoCuadrada />} />
            <Route path="RIntegridadAsientos" element={<IntegridadAsientos />} />
            <Route path="RDocumentoSinAsiento" element={<DocumentoSinAsiento />} />
            <Route path="RIntegridadAux" element={<ReporteIntegridadAuxiliares />} />
            <Route path="RDocumentosAnulados" element={<DocumentosAnulados />} />
            <Route path="ORepostear" element={<Repostear />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="notificaciones/config" element={<NotificacionesConfig />} />
          <Route path="notificaciones/personalizadas" element={<NotificacionesPersonalizadas />} />
          <Route path="visualizar-consulta/:configID" element={<VisualizarConsulta />} />
          <Route path="MTicket" element={<Tickets />} />
          <Route path="MSucursal" element={<Proximamente modulo="Sucursales" codigo="MSucursal" />} />
            <Route path="mplantillasup" element={<PlantillaSuplidor />} />
            <Route path="mplantillasup/nuevo" element={<PlantillaSuplidorFormulario />} />
            <Route path="mplantillasup/:id/editar" element={<PlantillaSuplidorFormulario />} />
            <Route path="mplantillasup/:id" element={<PlantillaSuplidorDetalle />} />
            <Route path="RMOVPLAN" element={<MovimientoPorPlantilla />} />
            <Route path="MServidor" element={<Proximamente modulo="Servidores" codigo="MServidor" />} />
          <Route path="MPermiso" element={<PermisosEspeciales />} />
          <Route path="MAuditoria" element={<Proximamente modulo="Historial y Auditoría" codigo="MAuditoria" />} />
          <Route path="OConfig" element={<Empresa />} />
          <Route path="reportesconfig" element={<ReportesConfig />} />
          <Route path="MConfigPedidosYa" element={<ConfigPedidosYa />} />
          <Route path="MTerminal" element={<Proximamente modulo="Terminales" codigo="MTerminal" />} />
           <Route path="MSincronizacion" element={<Proximamente modulo="Sincronización" codigo="MSincronizacion" />} />
            <Route path="MApiToken" element={<ApiTokens />} />
           <Route path="EDashboard" element={<EcommerceAdminDashboard />} />
           <Route path="EProductos" element={<EcommerceAdminProductos />} />
           <Route path="ECategorias" element={<EcommerceAdminCategorias />} />
           <Route path="EBanners" element={<EcommerceAdminBanners />} />
           <Route path="EOrdenes" element={<EcommerceAdminOrdenes />} />
           <Route path="EConfig" element={<EcommerceAdminConfig />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="Actividades" element={<ActividadesPage />} />
        <Route path="Actividades/Servicios" element={<ServiciosActividadPage />} />
            </Route>

         {/* ═══ RUTAS SAAS (nuevo layout) ════════════════════ */}
        <Route
          path="/saas"
          element={
            <ProtectedRoute>
              <PantallaGuard>
                <SaasMainLayout />
              </PantallaGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
            <Route path="Reportes/:modulo" element={<ReportesModulo />} />
            <Route path="FENP" element={<EntradaAlmacen />} />
            <Route path="FENP/nuevo" element={<EntradaAlmacenFormulario />} />
            <Route path="FENP/:id/editar" element={<EntradaAlmacenFormulario />} />
            <Route path="FENP/:id" element={<EntradaAlmacenDetalle />} />
            <Route path="FSAP" element={<SalidaAlmacen />} />
            <Route path="FSORC" element={<Proximamente modulo="Solicitud de Compra" codigo="FSORC" />} />
            <Route path="FSAP/nuevo" element={<SalidaAlmacenFormulario />} />
            <Route path="FSAP/:id/editar" element={<SalidaAlmacenFormulario />} />
            <Route path="FSAP/:id" element={<SalidaAlmacenDetalle />} />
           <Route path="FDVC" element={<DevolucionCompra />} />
            <Route path="FDVC/nuevo" element={<DevolucionCompraFormulario />} />
            <Route path="FDVC/:id/editar" element={<DevolucionCompraFormulario />} />
            <Route path="FDVC/:id" element={<DevolucionCompraDetalle />} />
           <Route path="FTRP" element={<TransferenciaAlmacen />} />
            <Route path="FTRP/nuevo" element={<TransferenciaAlmacenFormulario />} />
            <Route path="FTRP/:id/editar" element={<TransferenciaAlmacenFormulario />} />
            <Route path="FTRP/:id" element={<TransferenciaAlmacenDetalle />} />
            <Route path="FConcil" element={<ConciliacionBancaria />} />
            <Route path="FConcil/nuevo" element={<ConciliacionBancariaFormulario />} />
            <Route path="FConcil/:id/editar" element={<ConciliacionBancariaFormulario />} />
            <Route path="FConcil/:id" element={<ConciliacionBancariaDetalle />} />
            <Route path="FDEV" element={<DevolucionVenta />} />
            <Route path="FDEV/nuevo" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id/editar" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id" element={<DevolucionVentaDetalle />} />
            <Route path="RDEV" element={<ReporteDevolucionVenta />} />
            <Route path="R606" element={<Reporte606 />} />
            <Route path="RGORC/:idExterno" element={<GeneradorOrdenCompraReporte />} />
            <Route path="RDocAutorizado" element={<DocumentosAutorizados />} />
            <Route path="RDocAplicado" element={<DocumentosAplicados />} />
            <Route path="RDocCxPAutorizado" element={<DocumentosCxPAutorizados />} />
            <Route path="RDocCxPAplicado" element={<DocumentosCxPAplicados />} />
            <Route path="RSAPENP" element={<TransferenciaSucursales />} />
            <Route path="FCotizacion" element={<CotizacionVenta />} />
            <Route path="FCotizacion/nuevo" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id/editar" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id" element={<CotizacionVentaDetalle />} />
            <Route path="FPV" element={<FacturaPOS />} />
            <Route path="FPV/nuevo" element={<FacturaPOSFormulario />} />
            <Route path="FPV/:id/editar" element={<FacturaPOSFormulario />} />
            <Route path="FPV/:id" element={<FacturaPOSDetalle />} />
            <Route path="FFAC" element={<FacturaCliente />} />
            <Route path="FFAC/nuevo" element={<FacturaClienteFormulario />} />
            <Route path="FFAC/:id/editar" element={<FacturaClienteFormulario />} />
            <Route path="FFAC/:id" element={<FacturaClienteDetalle />} />
            <Route path="FRDE" element={<FacturaSuplidor />} />
            <Route path="FRDE/nuevo" element={<FacturaSuplidorFormulario />} />
            <Route path="FRDE/:id/editar" element={<FacturaSuplidorFormulario />} />
            <Route path="FRDE/:id" element={<FacturaSuplidorDetalle />} />
            <Route path="FNDSUP" element={<NotaDebito tipoEntidad="SUP" />} />
            <Route path="FNDSUP/nuevo" element={<NotaDebitoFormulario tipoEntidad="SUP" />} />
            <Route path="FNDSUP/:id/editar" element={<NotaDebitoFormulario tipoEntidad="SUP" />} />
            <Route path="FNDSUP/:id" element={<NotaDebitoDetalle tipoEntidad="SUP" />} />
            <Route path="FNDCLI" element={<NotaDebito tipoEntidad="CLI" />} />
            <Route path="FNDCLI/nuevo" element={<NotaDebitoFormulario tipoEntidad="CLI" />} />
            <Route path="FNDCLI/:id/editar" element={<NotaDebitoFormulario tipoEntidad="CLI" />} />
            <Route path="FNDCLI/:id" element={<NotaDebitoDetalle tipoEntidad="CLI" />} />
            <Route path="FNCSUP" element={<NotaCredito tipoEntidad="SUP" />} />
            <Route path="FNCSUP/nuevo" element={<NotaCreditoFormulario tipoEntidad="SUP" />} />
            <Route path="FNCSUP/:id/editar" element={<NotaCreditoFormulario tipoEntidad="SUP" />} />
            <Route path="FNCSUP/:id" element={<NotaCreditoDetalle tipoEntidad="SUP" />} />
            <Route path="FNCCLI" element={<NotaCredito tipoEntidad="CLI" />} />
            <Route path="FNCCLI/nuevo" element={<NotaCreditoFormulario tipoEntidad="CLI" />} />
            <Route path="FNCCLI/:id/editar" element={<NotaCreditoFormulario tipoEntidad="CLI" />} />
            <Route path="FNCCLI/:id" element={<NotaCreditoDetalle tipoEntidad="CLI" />} />
            <Route path="FDBASUP" element={<DistribucionBalance tipoEntidad="SUP" />} />
            <Route path="FDBASUP/nuevo" element={<DistribucionBalanceFormulario tipoEntidad="SUP" />} />
            <Route path="FDBASUP/:id/editar" element={<DistribucionBalanceFormulario tipoEntidad="SUP" />} />
            <Route path="FDBASUP/:id" element={<DistribucionBalanceDetalle tipoEntidad="SUP" />} />
            <Route path="FDBACLI" element={<DistribucionBalance tipoEntidad="CLI" />} />
            <Route path="FDBACLI/nuevo" element={<DistribucionBalanceFormulario tipoEntidad="CLI" />} />
            <Route path="FDBACLI/:id/editar" element={<DistribucionBalanceFormulario tipoEntidad="CLI" />} />
            <Route path="FDBACLI/:id" element={<DistribucionBalanceDetalle tipoEntidad="CLI" />} />
            <Route path="FRI" element={<ReciboIngreso />} />
            <Route path="FRI/nuevo" element={<ReciboIngresoFormulario />} />
            <Route path="FRI/:id/editar" element={<ReciboIngresoFormulario />} />
            <Route path="FRI/:id" element={<ReciboIngresoDetalle />} />
            <Route path="MUsuario" element={<Usuarios />} />
            <Route path="MUsuario/nuevo" element={<UsuarioFormulario />} />
            <Route path="MUsuario/:id/editar" element={<UsuarioFormulario />} />
            <Route path="MUsuario/:id" element={<UsuarioDetalle />} />
            <Route path="MROL" element={<Roles />} />
            <Route path="MROL/nuevo" element={<RolFormulario />} />
            <Route path="MROL/:id/editar" element={<RolFormulario />} />
            <Route path="MProducto" element={<Productos />} />
            <Route path="MProducto/nuevo" element={<ProductoFormulario />} />
            <Route path="MProducto/:codigo/editar" element={<ProductoFormulario />} />
            <Route path="MProducto/:codigo" element={<ProductoDetalle />} />
            <Route path="MProducto/importar" element={<ProductosImportar />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="MDocumento" element={<Documentos />} />
            <Route path="MDocumento/nuevo" element={<DocumentosFormulario />} />
            <Route path="MDocumento/:id/editar" element={<DocumentosFormulario />} />
            <Route path="MDocumento/:id" element={<DocumentosDetalle />} />
            <Route path="MConcepto" element={<Conceptos />} />
            <Route path="MConcepto/nuevo" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo/editar" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo" element={<ConceptoDetalle />} />
            <Route path="MAccion" element={<Acciones />} />
            <Route path="MPantalla" element={<Pantallas />} />
            <Route path="MPantalla/nuevo" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id/editar" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id" element={<PantallaDetalle />} />
            <Route path="Mmodulo" element={<Modulos />} />
            <Route path="Mmodulo/nuevo" element={<ModuloFormulario />} />
            <Route path="Mmodulo/:id" element={<ModuloDetalle />} />
            <Route path="Mmodulo/:id/editar" element={<ModuloFormulario />} />
            <Route path="MTipoCuenta" element={<TiposCuenta />} />
            <Route path="MCuentaContable" element={<CuentasContables />} />
            <Route path="MCuentaContable/:noCuenta" element={<CuentaContableDetalle />} />
            <Route path="MImpuesto" element={<Impuestos />} />
            <Route path="FAsientoContable" element={<AsientosContables />} />
            <Route path="FAsientoContable/nuevo" element={<AsientoContableFormulario />} />
            <Route path="FAsientoContable/:id/editar" element={<AsientoContableFormulario />} />
            <Route path="FAsientoContable/:id" element={<AsientoContableDetalle />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
            <Route path="MSecuenciaNCF" element={<SecuenciasNCF />} />
            <Route path="MCliente" element={<Clientes />} />
            <Route path="MCliente/nuevo" element={<ClienteDetalle />} />
            <Route path="MCliente/:codigo" element={<ClienteDetalle />} />
            <Route path="MPOS" element={<PuntosVenta />} />
            <Route path="TVISANET" element={<VisanetTest />} />
            <Route path="MMetodosPago" element={<MetodosPago />} />
            <Route path="MAlmacen" element={<Almacenes />} />
            <Route path="FDenominacion" element={<Denominaciones />} />
            <Route path="MServicio" element={<Servicios />} />
            <Route path="FActPrecio" element={<ActualizacionPrecio />} />
            <Route path="FActPrecio/nuevo" element={<ActualizacionPrecioFormulario />} />
            <Route path="FActPrecio/:id/editar" element={<ActualizacionPrecioFormulario />} />
            <Route path="FActPrecio/:id" element={<ActualizacionPrecioDetalle />} />
            <Route path="FTarifas" element={<Proximamente modulo="Tarifas" codigo="FTarifas" />} />
            <Route path="CCUADRECAJA" element={<Proximamente modulo="Cuadre de Caja" codigo="CCUADRECAJA" />} />
            <Route path="CCENTRALSUPERVISION" element={<MonitoreoCajas />} />
            <Route path="MPlanPago" element={<PlanesPago />} />
            <Route path="FORC" element={<OrdenCompra />} />
            <Route path="FORC/nuevo" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id/editar" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id" element={<OrdenCompraDetalle />} />
            <Route path="MSUP" element={<Proveedores />} />
            <Route path="MSUP/nuevo" element={<ProveedorDetalle />} />
            <Route path="MSUP/:codigo" element={<ProveedorDetalle />} />
            <Route path="MBanco" element={<Bancos />} />
            <Route path="FOfertas" element={<Ofertas />} />
            <Route path="MCuentaBanco" element={<CuentasBancarias />} />
            <Route path="MCuentaBanco/nuevo" element={<CuentaBancariaFormulario mode="crear" />} />
            <Route path="MCuentaBanco/editar/:codigo" element={<CuentaBancariaFormulario mode="editar" />} />
            <Route path="FTransBanco" element={<FTransBanco />} />
            <Route path="FTransBanco/nuevo" element={<TransaccionBancariaFormulario />} />
            <Route path="FTransBanco/:id/editar" element={<TransaccionBancariaFormulario />} />
            <Route path="FTransBanco/:id" element={<TransaccionBancariaDetalle />} />
            <Route path="MUnidadMedida" element={<UnidadesMedida />} />
            <Route path="MCategoria" element={<CategoriasArticulo />} />
            <Route path="MCategoria/:codigo" element={<CategoriaArticuloDetalle />} />
            <Route path="MFamilia" element={<FamiliasArticulo />} />
            <Route path="MMarca" element={<Proximamente modulo="Marcas" codigo="MMarca" />} />
            <Route path="MAtributo" element={<Proximamente modulo="Atributos" codigo="MAtributo" />} />
            <Route path="MPaquete" element={<Proximamente modulo="Paquetes" codigo="MPaquete" />} />
            <Route path="RCIERREFISCAL" element={<CierreFiscal />} />
            <Route path="RCIERREFISCAL/:transacId" element={<CierreFiscalDetalle />} />
            <Route path="OCierreMes" element={<CierreMes />} />
            <Route path="OPROCESOS" element={<Proximamente modulo="Procesos Contables" codigo="OPROCESOS" />} />
            <Route path="MReceta" element={<Recetas />} />
            <Route path="MAutomatizacion" element={<Automatizaciones />} />
            <Route path="MPerfil" element={<MiPerfil />} />
          <Route path="MEMP" element={<Empleados />} />
          <Route path="MEMP/nuevo" element={<EmpleadoFormulario />} />
          <Route path="MEMP/:codigo" element={<EmpleadoDetalle />} />
          <Route path="MEMP/:codigo/editar" element={<EmpleadoFormulario />} />
          <Route path="FTURNOS/:noTurno" element={<TurnoDetalle />} />
          <Route path="FTURNOS" element={<Turnos />} />
          <Route path="FConteos" element={<Conteos />} />
          <Route path="FConteos/:documento" element={<ConteoDetalle />} />
          <Route path="FConteos/editar/:documento" element={<ConteoFisicoFormulario />} />
            <Route path="CMovimientosProductos" element={<MovimientosProductos />} />
            <Route path="CDocRevisados" element={<Proximamente modulo="Documentos Revisados" codigo="CDocRevisados" />} />
            <Route path="FPRODPEND" element={<Proximamente modulo="Productos Pendientes" codigo="FPRODPEND" />} />
            <Route path="OPROCESARCONTEO" element={<Proximamente modulo="Procesar Conteos" codigo="OPROCESARCONTEO" />} />
          <Route path="OReglasAbastecimiento" element={<Proximamente modulo="Reglas de Abastecimiento" codigo="OReglasAbastecimiento" />} />
          <Route path="FSPA" element={<SolicitudPago />} />
          <Route path="FSPA/nuevo" element={<SolicitudPagoFormulario />} />
          <Route path="FSPA/:id/editar" element={<SolicitudPagoFormulario />} />
          <Route path="FSPA/:id" element={<SolicitudPagoDetalle />} />
          <Route path="OImportarINV" element={<ImportarInventario />} />
          <Route path="OImportarDocBanco" element={<ImportarDocBanco />} />
          <Route path="OCierreINV" element={<CierreInventario />} />
          <Route path="OCierreINV/detalle/:cierreId" element={<CierreDetalle />} />
            <Route path="FGORC" element={<GeneradorORC />} />
            <Route path="FGORC/nuevo" element={<GeneradorORCFormulario />} />
            <Route path="FGORC/:id/editar" element={<GeneradorORCFormulario />} />
          <Route path="FGORC/:id" element={<GeneradorORCDetalle />} />
          <Route path="RMOVDOC" element={<Rmovdoc />} />
          <Route path="OActualizacionCostos" element={<ActualizacionCostos />} />
          <Route path="RAntiguedaCXC" element={<AntiguedadSaldos tipoEntidad="CLI" />} />
          <Route path="RAntiguedadCXP" element={<AntiguedadSaldos tipoEntidad="SUP" />} />
          <Route path="RAntiguedaCXC/detalle" element={<DetalleSuplidor />} />
          <Route path="RAntiguedadCXP/detalle" element={<DetalleSuplidor />} />
          <Route path="RAntiguedadSaldoDVC" element={<AntiguedadSaldosDVC />} />
          <Route path="RFACVEN" element={<FacturasVencidas />} />
            <Route path="RMayorAux" element={<MayorAuxiliar />} />
            <Route path="RDiarioGeneral" element={<DiarioGeneral />} />
            <Route path="RTransNoCuadrada" element={<TransaccionNoCuadrada />} />
            <Route path="RIntegridadAsientos" element={<IntegridadAsientos />} />
            <Route path="RDocumentoSinAsiento" element={<DocumentoSinAsiento />} />
            <Route path="RIntegridadAux" element={<ReporteIntegridadAuxiliares />} />
            <Route path="RDocumentosAnulados" element={<DocumentosAnulados />} />
            <Route path="ORepostear" element={<Repostear />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="notificaciones/config" element={<NotificacionesConfig />} />
          <Route path="notificaciones/personalizadas" element={<NotificacionesPersonalizadas />} />
          <Route path="visualizar-consulta/:configID" element={<VisualizarConsulta />} />
          <Route path="MTicket" element={<Tickets />} />
          <Route path="MSucursal" element={<Proximamente modulo="Sucursales" codigo="MSucursal" />} />
            <Route path="mplantillasup" element={<PlantillaSuplidor />} />
            <Route path="mplantillasup/nuevo" element={<PlantillaSuplidorFormulario />} />
            <Route path="mplantillasup/:id/editar" element={<PlantillaSuplidorFormulario />} />
            <Route path="mplantillasup/:id" element={<PlantillaSuplidorDetalle />} />
            <Route path="RMOVPLAN" element={<MovimientoPorPlantilla />} />
            <Route path="MServidor" element={<Proximamente modulo="Servidores" codigo="MServidor" />} />
          <Route path="MPermiso" element={<PermisosEspeciales />} />
          <Route path="MAuditoria" element={<Proximamente modulo="Historial y Auditoría" codigo="MAuditoria" />} />
          <Route path="OConfig" element={<Empresa />} />
          <Route path="reportesconfig" element={<ReportesConfig />} />
          <Route path="MConfigPedidosYa" element={<ConfigPedidosYa />} />
          <Route path="MTerminal" element={<Proximamente modulo="Terminales" codigo="MTerminal" />} />
           <Route path="MSincronizacion" element={<Proximamente modulo="Sincronización" codigo="MSincronizacion" />} />
            <Route path="MApiToken" element={<ApiTokens />} />
           <Route path="EDashboard" element={<EcommerceAdminDashboard />} />
           <Route path="EProductos" element={<EcommerceAdminProductos />} />
           <Route path="ECategorias" element={<EcommerceAdminCategorias />} />
           <Route path="EBanners" element={<EcommerceAdminBanners />} />
           <Route path="EOrdenes" element={<EcommerceAdminOrdenes />} />
           <Route path="EConfig" element={<EcommerceAdminConfig />} />
           <Route path="chat" element={<ChatPage />} />
           </Route>

        {/* Rutas de documentación (sin autenticación, fuera de MainLayout) */}
        <Route path="/documentacion" element={<DocumentacionPage />} />
        <Route path="/documentacion/:modulo/:doc" element={<DocumentacionPage />} />

        {/* Rutas públicas Ecommerce (catálogo/tienda) */}
        <Route path="/store" element={<HomePage />} />
        <Route path="/store/producto/:codigo" element={<StoreProductoDetalle />} />
        <Route path="/store/checkout" element={<CheckoutPage />} />
        <Route path="/store/orden/:id" element={<OrdenConfirmacionPage />} />
        <Route path="/store/ordenes" element={<OrdenesPage />} />
        <Route path="/store/login" element={<LoginPage />} />
        <Route path="/store/registro" element={<RegistroPage />} />
        <Route path="/store/perfil" element={<PerfilPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </React.Suspense>
    </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
