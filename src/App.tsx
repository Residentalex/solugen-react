import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login/Login';
import CambiarClave from './pages/CambiarClave/CambiarClave';
import MainLayout from './layouts/MainLayout';
import SaasMainLayout from './layouts/SaasMainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaAlmacen from './pages/EntradaAlmacen/EntradaAlmacen';
import EntradaAlmacenDetalle from './pages/EntradaAlmacen/EntradaAlmacenDetalle';
import EntradaAlmacenFormulario from './pages/EntradaAlmacen/EntradaAlmacenFormulario';
import SalidaAlmacen from './pages/SalidaAlmacen/SalidaAlmacen';
import SalidaAlmacenDetalle from './pages/SalidaAlmacen/SalidaAlmacenDetalle';
import SalidaAlmacenFormulario from './pages/SalidaAlmacen/SalidaAlmacenFormulario';
import DevolucionCompra from './pages/DevolucionCompra/DevolucionCompra';
import DevolucionCompraDetalle from './pages/DevolucionCompra/DevolucionCompraDetalle';
import DevolucionCompraFormulario from './pages/DevolucionCompra/DevolucionCompraFormulario';
import TransferenciaAlmacen from './pages/TransferenciaAlmacen/TransferenciaAlmacen';
import TransferenciaAlmacenDetalle from './pages/TransferenciaAlmacen/TransferenciaAlmacenDetalle';
import TransferenciaAlmacenFormulario from './pages/TransferenciaAlmacen/TransferenciaAlmacenFormulario';
import DevolucionVenta from './pages/DevolucionVenta/DevolucionVenta';
import DevolucionVentaDetalle from './pages/DevolucionVenta/DevolucionVentaDetalle';
import DevolucionVentaFormulario from './pages/DevolucionVenta/DevolucionVentaFormulario';
import ReporteDevolucionVenta from './pages/ReporteDevolucionVenta/ReporteDevolucionVenta';
import CotizacionVenta from './pages/CotizacionVenta/CotizacionVenta';
import CotizacionVentaFormulario from './pages/CotizacionVenta/CotizacionVentaFormulario';
import FacturaPOS from './pages/FacturaPOS/FacturaPOS';
import FacturaPOSDetalle from './pages/FacturaPOS/FacturaPOSDetalle';
import FacturaPOSFormulario from './pages/FacturaPOS/FacturaPOSFormulario';
import FacturaCliente from './pages/FacturaCliente/FacturaCliente';
import FacturaClienteDetalle from './pages/FacturaCliente/FacturaClienteDetalle';
import FacturaClienteFormulario from './pages/FacturaCliente/FacturaClienteFormulario';
import FacturaSuplidor from './pages/FacturaSuplidor/FacturaSuplidor';
import FacturaSuplidorDetalle from './pages/FacturaSuplidor/FacturaSuplidorDetalle';
import FacturaSuplidorFormulario from './pages/FacturaSuplidor/FacturaSuplidorFormulario';
import NotaDebito from './pages/NotaDebito/NotaDebito';
import NotaDebitoDetalle from './pages/NotaDebito/NotaDebitoDetalle';
import NotaDebitoFormulario from './pages/NotaDebito/NotaDebitoFormulario';
import NotaCredito from './pages/NotaCredito/NotaCredito';
import NotaCreditoDetalle from './pages/NotaCredito/NotaCreditoDetalle';
import NotaCreditoFormulario from './pages/NotaCredito/NotaCreditoFormulario';
import DistribucionBalance from './pages/DistribucionBalance/DistribucionBalance';
import DistribucionBalanceDetalle from './pages/DistribucionBalance/DistribucionBalanceDetalle';
import DistribucionBalanceFormulario from './pages/DistribucionBalance/DistribucionBalanceFormulario';
import ReciboIngreso from './pages/ReciboIngreso/ReciboIngreso';
import ReciboIngresoDetalle from './pages/ReciboIngreso/ReciboIngresoDetalle';
import ReciboIngresoFormulario from './pages/ReciboIngreso/ReciboIngresoFormulario';
import Usuarios from './pages/Usuarios/Usuarios';
import UsuarioDetalle from './pages/Usuarios/UsuarioDetalle';
import UsuarioFormulario from './pages/Usuarios/UsuarioFormulario';
import Roles from './pages/Roles/Roles';
import RolFormulario from './pages/Roles/RolFormulario';
import Modulos from './pages/Modulos/Modulos';
import ModuloFormulario from './pages/Modulos/ModuloFormulario';
import ModuloDetalle from './pages/Modulos/ModuloDetalle';
import Productos from './pages/Productos/Productos';
import ProductoDetalle from './pages/Productos/ProductoDetalle';
import ProductosImportar from './pages/Productos/ProductosImportar';
import Monedas from './pages/Monedas/Monedas';
import Documentos from './pages/Documentos/Documentos';
import Conceptos from './pages/Conceptos/Conceptos';
import ConceptoDetalle from './pages/Conceptos/ConceptoDetalle';
import ConceptoFormulario from './pages/Conceptos/ConceptoFormulario';
import Pantallas from './pages/Pantallas/Pantallas';
import PantallaDetalle from './pages/Pantallas/PantallaDetalle';
import PantallaFormulario from './pages/Pantallas/PantallaFormulario';
import TiposCuenta from './pages/TiposCuenta/TiposCuenta';
import CuentasContables from './pages/CuentasContables/CuentasContables';
import CuentaContableDetalle from './pages/CuentasContables/CuentaContableDetalle';
import Impuestos from './pages/Impuestos/Impuestos';
import AsientosContables from './pages/AsientosContables/AsientosContables';
import AsientoContableDetalle from './pages/AsientosContables/AsientoContableDetalle';
import CFacturasElectronicas from './pages/DGII/CFacturasElectronicas';
import CierreFiscal from './pages/CierreFiscal/CierreFiscal';
import CierreMes from './pages/CierreMes/CierreMes';
import SecuenciasNCF from './pages/SecuenciasNCF/SecuenciasNCF';
import Clientes from './pages/Clientes/Clientes';
import ClienteDetalle from './pages/Clientes/ClienteDetalle';
import PuntosVenta from './pages/PuntosVenta/PuntosVenta';
import MetodosPago from './pages/MetodosPago/MetodosPago';
import Repostear from './pages/Repostear/Repostear';
import Acciones from './pages/Acciones/Acciones';
import PlanesPago from './pages/PlanesPago/PlanesPago';
import Almacenes from './pages/Almacenes/Almacenes';
import Denominaciones from './pages/Denominaciones/Denominaciones';
import Proximamente from './pages/Proximamente';
import PermisosEspeciales from './pages/PermisosEspeciales/PermisosEspeciales';
import OrdenCompra from './pages/OrdenCompra/OrdenCompra';
import OrdenCompraDetalle from './pages/OrdenCompra/OrdenCompraDetalle';
import OrdenCompraFormulario from './pages/OrdenCompra/OrdenCompraFormulario';
import Proveedores from './pages/Proveedores/Proveedores';
import ProveedorDetalle from './pages/Proveedores/ProveedorDetalle';
import Bancos from './pages/Bancos/Bancos';
import Ofertas from './pages/Ofertas/Ofertas';
import CuentasBancarias from './pages/CuentasBancarias/CuentasBancarias';
import FTransBanco from './pages/CuentasBancarias/CuentaBancariaDetalle';
import UnidadesMedida from './pages/UnidadesMedida/UnidadesMedida';
import CategoriasArticulo from './pages/CategoriasArticulo/CategoriasArticulo';
import FamiliasArticulo from './pages/FamiliasArticulo/FamiliasArticulo';
import SolicitudPago from './pages/SolicitudPago/SolicitudPago';
import SolicitudPagoDetalle from './pages/SolicitudPago/SolicitudPagoDetalle';
import SolicitudPagoFormulario from './pages/SolicitudPago/SolicitudPagoFormulario';
import Notificaciones from './pages/Notificaciones/Notificaciones';
import NotificacionesConfig from './pages/Notificaciones/Configuracion';
import NotificacionesPersonalizadas from './pages/Notificaciones/NotificacionesPersonalizadas';
import Recetas from './pages/Recetas/Recetas';
import Automatizaciones from './pages/Automatizaciones/Automatizaciones';
import MiPerfil from './pages/MiPerfil/MiPerfil';
import Servicios from './pages/Servicios/Servicios';
import ActualizacionPrecio from './pages/ActualizacionPrecio/ActualizacionPrecio';
import Turnos from './pages/Turnos/Turnos';
import TurnoDetalle from './pages/Turnos/TurnoDetalle';
import Conteos from './pages/Conteos/Conteos';
import ConteoDetalle from './pages/Conteos/ConteoDetalle';
import MovimientosProductos from './pages/MovimientosProductos/MovimientosProductos';
import ImportarInventario from './pages/ImportarInventario/ImportarInventario';
import ActualizacionCostos from './pages/ActualizacionCostos/ActualizacionCostos';
import AntiguedadSaldos from './pages/AntiguedadSaldos/AntiguedadSaldos';
import AntiguedadSaldosDVC from './pages/AntiguedadSaldosDVC/AntiguedadSaldosDVC';
import MayorAuxiliar from './pages/MayorAuxiliar/MayorAuxiliar';
import TransaccionNoCuadrada from './pages/TransaccionNoCuadrada/TransaccionNoCuadrada';
import IntegridadAsientos from './pages/IntegridadAsientos/IntegridadAsientos';
import DocumentosAnulados from './pages/DocumentosAnulados/DocumentosAnulados';
import CierreInventario from './pages/CierreInventario/CierreInventario';
import CierreDetalle from './pages/CierreInventario/CierreDetalle';
import GeneradorORC from './pages/GeneradorORC/GeneradorORC';
import GeneradorORCDetalle from './pages/GeneradorORC/GeneradorORCDetalle';
import GeneradorORCFormulario from './pages/GeneradorORC/GeneradorORCFormulario';
import Tickets from './pages/Tickets/Tickets';
import Empleados from './pages/Empleados/Empleados';
import EmpleadoDetalle from './pages/Empleados/EmpleadoDetalle';
import EmpleadoFormulario from './pages/Empleados/EmpleadoFormulario';
import VisualizarConsulta from './pages/Notificaciones/VisualizarConsulta';
import PlantillaSuplidor from './pages/PlantillaSuplidor/PlantillaSuplidor';
import PlantillaSuplidorDetalle from './pages/PlantillaSuplidor/PlantillaSuplidorDetalle';
import PlantillaSuplidorFormulario from './pages/PlantillaSuplidor/PlantillaSuplidorFormulario';
import MovimientoPorPlantilla from './pages/MovimientoPorPlantilla/MovimientoPorPlantilla';
import DocumentacionPage from './pages/Documentacion/DocumentacionPage';
import Store from './pages/Ecommerce/Store';
import StoreProductoDetalle from './pages/Ecommerce/StoreProductoDetalle';
import HomePage from './pages/Ecommerce/HomePage';
import CheckoutPage from './pages/Ecommerce/CheckoutPage';
import OrdenConfirmacionPage from './pages/Ecommerce/OrdenConfirmacionPage';
import OrdenesPage from './pages/Ecommerce/OrdenesPage';
import LoginPage from './pages/Ecommerce/LoginPage';
import RegistroPage from './pages/Ecommerce/RegistroPage';
import PerfilPage from './pages/Ecommerce/PerfilPage';
import EcommerceAdminDashboard from './pages/Ecommerce/Admin/EcommerceAdminDashboard';
import EcommerceAdminProductos from './pages/Ecommerce/Admin/EcommerceAdminProductos';
import EcommerceAdminCategorias from './pages/Ecommerce/Admin/EcommerceAdminCategorias';
import EcommerceAdminBanners from './pages/Ecommerce/Admin/EcommerceAdminBanners';
import EcommerceAdminOrdenes from './pages/Ecommerce/Admin/EcommerceAdminOrdenes';
import EcommerceAdminConfig from './pages/Ecommerce/Admin/EcommerceAdminConfig';
import ApiTokens from './pages/ApiTokens/ApiTokens';
import DocumentosAutorizados from './pages/DocumentosAutorizados/DocumentosAutorizados';
import DocumentosAplicados from './pages/DocumentosAplicados/DocumentosAplicados';
import TransferenciaSucursales from './pages/TransferenciaSucursales/TransferenciaSucursales';
import Empresa from './pages/Configuracion/Empresa';

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
  // Extraer el código de la pantalla desde el primer segmento de la ruta
  // Si la ruta empieza con /saas/, ignorar ese prefijo
  const segmentos = location.pathname.split('/').filter(Boolean);
  const codigoRuta = segmentos[0] === 'saas' ? (segmentos[1] || '') : (segmentos[0] || '');
  if (codigoRuta && !['dashboard', 'cambiar-clave', 'MPERFIL', 'MPerfil', 'notificaciones', 'MTicket', 'visualizar-consulta', 'MApiToken', 'Modulos'].includes(codigoRuta)) {
    const tieneAcceso = pantallas.some((p) => p.codigo.toLowerCase() === codigoRuta.toLowerCase());
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
            <Route path="FDEV" element={<DevolucionVenta />} />
            <Route path="FDEV/nuevo" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id/editar" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id" element={<DevolucionVentaDetalle />} />
            <Route path="RDEV" element={<ReporteDevolucionVenta />} />
            <Route path="RDocAutorizado" element={<DocumentosAutorizados />} />
            <Route path="RDocAplicado" element={<DocumentosAplicados />} />
            <Route path="RSAPENP" element={<TransferenciaSucursales />} />
            <Route path="FCotizacion" element={<CotizacionVenta />} />
            <Route path="FCotizacion/nuevo" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id/editar" element={<CotizacionVentaFormulario />} />
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
            <Route path="MProducto/:codigo" element={<ProductoDetalle />} />
            <Route path="MProducto/importar" element={<ProductosImportar />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="MDocumento" element={<Documentos />} />
            <Route path="MConcepto" element={<Conceptos />} />
            <Route path="MConcepto/nuevo" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo/editar" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo" element={<ConceptoDetalle />} />
            <Route path="MAccion" element={<Acciones />} />
            <Route path="MPantalla" element={<Pantallas />} />
            <Route path="MPantalla/nuevo" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id/editar" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id" element={<PantallaDetalle />} />
            <Route path="Modulos" element={<Modulos />} />
            <Route path="Modulos/nuevo" element={<ModuloFormulario />} />
            <Route path="Modulos/:id" element={<ModuloDetalle />} />
            <Route path="Modulos/:id/editar" element={<ModuloFormulario />} />
            <Route path="MTipoCuenta" element={<TiposCuenta />} />
            <Route path="MCuentaContable" element={<CuentasContables />} />
            <Route path="MCuentaContable/:noCuenta" element={<CuentaContableDetalle />} />
            <Route path="MImpuesto" element={<Impuestos />} />
            <Route path="FAsientoContable" element={<AsientosContables />} />
            <Route path="FAsientoContable/:id" element={<AsientoContableDetalle />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
            <Route path="MSecuenciaNCF" element={<SecuenciasNCF />} />
            <Route path="MCliente" element={<Clientes />} />
            <Route path="MCliente/nuevo" element={<ClienteDetalle />} />
            <Route path="MCliente/:codigo" element={<ClienteDetalle />} />
            <Route path="MPOS" element={<PuntosVenta />} />
            <Route path="MMetodosPago" element={<MetodosPago />} />
            <Route path="MAlmacen" element={<Almacenes />} />
            <Route path="FDenominacion" element={<Denominaciones />} />
            <Route path="MServicio" element={<Servicios />} />
            <Route path="FActPrecio" element={<ActualizacionPrecio />} />
            <Route path="FTarifas" element={<Proximamente modulo="Tarifas" codigo="FTarifas" />} />
            <Route path="CCUADRECAJA" element={<Proximamente modulo="Cuadre de Caja" codigo="CCUADRECAJA" />} />
            <Route path="CCENTRALSUPERVISION" element={<Proximamente modulo="Central de Supervisión" codigo="CCENTRALSUPERVISION" />} />
            <Route path="MPlanPago" element={<PlanesPago />} />
            <Route path="FORC" element={<OrdenCompra />} />
            <Route path="FORC/nuevo" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id/editar" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id" element={<OrdenCompraDetalle />} />
            <Route path="MSUP" element={<Proveedores />} />
            <Route path="MSUP/:codigo" element={<ProveedorDetalle />} />
            <Route path="MBanco" element={<Bancos />} />
            <Route path="FOfertas" element={<Ofertas />} />
            <Route path="MCuentaBanco" element={<CuentasBancarias />} />
            <Route path="FTransBanco" element={<FTransBanco />} />
            <Route path="MUnidadMedida" element={<UnidadesMedida />} />
            <Route path="MCategoria" element={<CategoriasArticulo />} />
            <Route path="MFamilia" element={<FamiliasArticulo />} />
            <Route path="MMarca" element={<Proximamente modulo="Marcas" codigo="MMarca" />} />
            <Route path="MAtributo" element={<Proximamente modulo="Atributos" codigo="MAtributo" />} />
            <Route path="MPaquete" element={<Proximamente modulo="Paquetes" codigo="MPaquete" />} />
            <Route path="RCIERREFISCAL" element={<CierreFiscal />} />
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
          <Route path="OCierreINV" element={<CierreInventario />} />
          <Route path="OCierreINV/detalle/:cierreId" element={<CierreDetalle />} />
            <Route path="FGORC" element={<GeneradorORC />} />
            <Route path="FGORC/nuevo" element={<GeneradorORCFormulario />} />
            <Route path="FGORC/:id/editar" element={<GeneradorORCFormulario />} />
          <Route path="FGORC/:id" element={<GeneradorORCDetalle />} />
          <Route path="OActualizacionCostos" element={<ActualizacionCostos />} />
          <Route path="RAntiguedaCXC" element={<AntiguedadSaldos tipoEntidad="CLI" />} />
          <Route path="RAntiguedadCXP" element={<AntiguedadSaldos tipoEntidad="SUP" />} />
          <Route path="RAntiguedadSaldoDVC" element={<AntiguedadSaldosDVC />} />
            <Route path="RMayorAux" element={<MayorAuxiliar />} />
            <Route path="RTransNoCuadrada" element={<TransaccionNoCuadrada />} />
            <Route path="RIntegridadAsientos" element={<IntegridadAsientos />} />
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
          <Route path="MTerminal" element={<Proximamente modulo="Terminales" codigo="MTerminal" />} />
          <Route path="MSincronizacion" element={<Proximamente modulo="Sincronización" codigo="MSincronizacion" />} />
           <Route path="MApiToken" element={<ApiTokens />} />
           <Route path="EDashboard" element={<EcommerceAdminDashboard />} />
           <Route path="EProductos" element={<EcommerceAdminProductos />} />
           <Route path="ECategorias" element={<EcommerceAdminCategorias />} />
           <Route path="EBanners" element={<EcommerceAdminBanners />} />
           <Route path="EOrdenes" element={<EcommerceAdminOrdenes />} />
           <Route path="EConfig" element={<EcommerceAdminConfig />} />
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
            <Route path="FDEV" element={<DevolucionVenta />} />
            <Route path="FDEV/nuevo" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id/editar" element={<DevolucionVentaFormulario />} />
            <Route path="FDEV/:id" element={<DevolucionVentaDetalle />} />
            <Route path="RDEV" element={<ReporteDevolucionVenta />} />
            <Route path="RDocAutorizado" element={<DocumentosAutorizados />} />
            <Route path="RDocAplicado" element={<DocumentosAplicados />} />
            <Route path="RSAPENP" element={<TransferenciaSucursales />} />
            <Route path="FCotizacion" element={<CotizacionVenta />} />
            <Route path="FCotizacion/nuevo" element={<CotizacionVentaFormulario />} />
            <Route path="FCotizacion/:id/editar" element={<CotizacionVentaFormulario />} />
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
            <Route path="MProducto/:codigo" element={<ProductoDetalle />} />
            <Route path="MProducto/importar" element={<ProductosImportar />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="MDocumento" element={<Documentos />} />
            <Route path="MConcepto" element={<Conceptos />} />
            <Route path="MConcepto/nuevo" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo/editar" element={<ConceptoFormulario />} />
            <Route path="MConcepto/:codigo" element={<ConceptoDetalle />} />
            <Route path="MAccion" element={<Acciones />} />
            <Route path="MPantalla" element={<Pantallas />} />
            <Route path="MPantalla/nuevo" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id/editar" element={<PantallaFormulario />} />
            <Route path="MPantalla/:id" element={<PantallaDetalle />} />
            <Route path="Modulos" element={<Modulos />} />
            <Route path="Modulos/nuevo" element={<ModuloFormulario />} />
            <Route path="Modulos/:id" element={<ModuloDetalle />} />
            <Route path="Modulos/:id/editar" element={<ModuloFormulario />} />
            <Route path="MTipoCuenta" element={<TiposCuenta />} />
            <Route path="MCuentaContable" element={<CuentasContables />} />
            <Route path="MCuentaContable/:noCuenta" element={<CuentaContableDetalle />} />
            <Route path="MImpuesto" element={<Impuestos />} />
            <Route path="FAsientoContable" element={<AsientosContables />} />
            <Route path="FAsientoContable/:id" element={<AsientoContableDetalle />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
            <Route path="MSecuenciaNCF" element={<SecuenciasNCF />} />
            <Route path="MCliente" element={<Clientes />} />
            <Route path="MCliente/nuevo" element={<ClienteDetalle />} />
            <Route path="MCliente/:codigo" element={<ClienteDetalle />} />
            <Route path="MPOS" element={<PuntosVenta />} />
            <Route path="MMetodosPago" element={<MetodosPago />} />
            <Route path="MAlmacen" element={<Almacenes />} />
            <Route path="FDenominacion" element={<Denominaciones />} />
            <Route path="MServicio" element={<Servicios />} />
            <Route path="FActPrecio" element={<ActualizacionPrecio />} />
            <Route path="FTarifas" element={<Proximamente modulo="Tarifas" codigo="FTarifas" />} />
            <Route path="CCUADRECAJA" element={<Proximamente modulo="Cuadre de Caja" codigo="CCUADRECAJA" />} />
            <Route path="CCENTRALSUPERVISION" element={<Proximamente modulo="Central de Supervisión" codigo="CCENTRALSUPERVISION" />} />
            <Route path="MPlanPago" element={<PlanesPago />} />
            <Route path="FORC" element={<OrdenCompra />} />
            <Route path="FORC/nuevo" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id/editar" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id" element={<OrdenCompraDetalle />} />
            <Route path="MSUP" element={<Proveedores />} />
            <Route path="MSUP/:codigo" element={<ProveedorDetalle />} />
            <Route path="MBanco" element={<Bancos />} />
            <Route path="FOfertas" element={<Ofertas />} />
            <Route path="MCuentaBanco" element={<CuentasBancarias />} />
            <Route path="FTransBanco" element={<FTransBanco />} />
            <Route path="MUnidadMedida" element={<UnidadesMedida />} />
            <Route path="MCategoria" element={<CategoriasArticulo />} />
            <Route path="MFamilia" element={<FamiliasArticulo />} />
            <Route path="MMarca" element={<Proximamente modulo="Marcas" codigo="MMarca" />} />
            <Route path="MAtributo" element={<Proximamente modulo="Atributos" codigo="MAtributo" />} />
            <Route path="MPaquete" element={<Proximamente modulo="Paquetes" codigo="MPaquete" />} />
            <Route path="RCIERREFISCAL" element={<CierreFiscal />} />
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
          <Route path="OCierreINV" element={<CierreInventario />} />
          <Route path="OCierreINV/detalle/:cierreId" element={<CierreDetalle />} />
            <Route path="FGORC" element={<GeneradorORC />} />
            <Route path="FGORC/nuevo" element={<GeneradorORCFormulario />} />
            <Route path="FGORC/:id/editar" element={<GeneradorORCFormulario />} />
          <Route path="FGORC/:id" element={<GeneradorORCDetalle />} />
          <Route path="OActualizacionCostos" element={<ActualizacionCostos />} />
          <Route path="RAntiguedaCXC" element={<AntiguedadSaldos tipoEntidad="CLI" />} />
          <Route path="RAntiguedadCXP" element={<AntiguedadSaldos tipoEntidad="SUP" />} />
          <Route path="RAntiguedadSaldoDVC" element={<AntiguedadSaldosDVC />} />
            <Route path="RMayorAux" element={<MayorAuxiliar />} />
            <Route path="RTransNoCuadrada" element={<TransaccionNoCuadrada />} />
            <Route path="RIntegridadAsientos" element={<IntegridadAsientos />} />
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
          <Route path="MTerminal" element={<Proximamente modulo="Terminales" codigo="MTerminal" />} />
          <Route path="MSincronizacion" element={<Proximamente modulo="Sincronización" codigo="MSincronizacion" />} />
           <Route path="MApiToken" element={<ApiTokens />} />
           <Route path="EDashboard" element={<EcommerceAdminDashboard />} />
           <Route path="EProductos" element={<EcommerceAdminProductos />} />
           <Route path="ECategorias" element={<EcommerceAdminCategorias />} />
           <Route path="EBanners" element={<EcommerceAdminBanners />} />
           <Route path="EOrdenes" element={<EcommerceAdminOrdenes />} />
           <Route path="EConfig" element={<EcommerceAdminConfig />} />
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
    </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
