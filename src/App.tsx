import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login/Login';
import CambiarClave from './pages/CambiarClave/CambiarClave';
import MainLayout from './layouts/MainLayout';
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
import Roles from './pages/Roles/Roles';
import RolFormulario from './pages/Roles/RolFormulario';
import Productos from './pages/Productos/Productos';
import ProductoDetalle from './pages/Productos/ProductoDetalle';
import ProductosImportar from './pages/Productos/ProductosImportar';
import Monedas from './pages/Monedas/Monedas';
import Conceptos from './pages/Conceptos/Conceptos';
import Pantallas from './pages/Pantallas/Pantallas';
import TiposCuenta from './pages/TiposCuenta/TiposCuenta';
import CuentasContables from './pages/CuentasContables/CuentasContables';
import CuentaContableDetalle from './pages/CuentasContables/CuentaContableDetalle';
import Impuestos from './pages/Impuestos/Impuestos';
import AsientosContables from './pages/AsientosContables/AsientosContables';
import CFacturasElectronicas from './pages/DGII/CFacturasElectronicas';
import SecuenciasNCF from './pages/SecuenciasNCF/SecuenciasNCF';
import Clientes from './pages/Clientes/Clientes';
import ClienteDetalle from './pages/Clientes/ClienteDetalle';
import PuntosVenta from './pages/PuntosVenta/PuntosVenta';
import MetodosPago from './pages/MetodosPago/MetodosPago';
import Repostear from './pages/Repostear/Repostear';
import Acciones from './pages/Acciones/Acciones';
import PlanesPago from './pages/PlanesPago/PlanesPago';
import Almacenes from './pages/Almacenes/Almacenes';
import Proximamente from './pages/Proximamente';
import OrdenCompra from './pages/OrdenCompra/OrdenCompra';
import OrdenCompraDetalle from './pages/OrdenCompra/OrdenCompraDetalle';
import OrdenCompraFormulario from './pages/OrdenCompra/OrdenCompraFormulario';
import Proveedores from './pages/Proveedores/Proveedores';
import ProveedorDetalle from './pages/Proveedores/ProveedorDetalle';
import Bancos from './pages/Bancos/Bancos';
import CuentasBancarias from './pages/CuentasBancarias/CuentasBancarias';
import UnidadesMedida from './pages/UnidadesMedida/UnidadesMedida';
import CategoriasArticulo from './pages/CategoriasArticulo/CategoriasArticulo';
import FamiliasArticulo from './pages/FamiliasArticulo/FamiliasArticulo';
import SolicitudPago from './pages/SolicitudPago/SolicitudPago';
import SolicitudPagoDetalle from './pages/SolicitudPago/SolicitudPagoDetalle';
import SolicitudPagoFormulario from './pages/SolicitudPago/SolicitudPagoFormulario';
import Notificaciones from './pages/Notificaciones/Notificaciones';
import NotificacionesConfig from './pages/Notificaciones/Configuracion';
import Recetas from './pages/Recetas/Recetas';
import Automatizaciones from './pages/Automatizaciones/Automatizaciones';
import MiPerfil from './pages/MiPerfil/MiPerfil';

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
  const segmentos = location.pathname.split('/').filter(Boolean);
  const codigoRuta = segmentos[0] || '';
  if (codigoRuta && !['dashboard', 'cambiar-clave', 'MPERFIL', 'MPerfil'].includes(codigoRuta)) {
    const tieneAcceso = pantallas.some((p) => p.codigo.toLowerCase() === codigoRuta.toLowerCase());
    if (!tieneAcceso) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
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
            <Route path="MUsuario/:id" element={<UsuarioDetalle />} />
            <Route path="MROL" element={<Roles />} />
            <Route path="MROL/nuevo" element={<RolFormulario />} />
            <Route path="MROL/:id/editar" element={<RolFormulario />} />
            <Route path="MProducto" element={<Productos />} />
            <Route path="MProducto/:codigo" element={<ProductoDetalle />} />
            <Route path="MProducto/importar" element={<ProductosImportar />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="MConcepto" element={<Conceptos />} />
            <Route path="MAccion" element={<Acciones />} />
            <Route path="MPantalla" element={<Pantallas />} />
            <Route path="MTipoCuenta" element={<TiposCuenta />} />
            <Route path="MCuentaContable" element={<CuentasContables />} />
            <Route path="FCuentaContable/:noCuenta" element={<CuentaContableDetalle />} />
            <Route path="MImpuesto" element={<Impuestos />} />
            <Route path="FAsientoContable" element={<AsientosContables />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
            <Route path="MSecuenciaNCF" element={<SecuenciasNCF />} />
            <Route path="MCliente" element={<Clientes />} />
            <Route path="MCliente/nuevo" element={<ClienteDetalle />} />
            <Route path="MCliente/:codigo" element={<ClienteDetalle />} />
            <Route path="MPOS" element={<PuntosVenta />} />
            <Route path="MMetodosPago" element={<MetodosPago />} />
            <Route path="MAlmacen" element={<Almacenes />} />
            <Route path="MPlanPago" element={<PlanesPago />} />
            <Route path="FORC" element={<OrdenCompra />} />
            <Route path="FORC/nuevo" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id/editar" element={<OrdenCompraFormulario />} />
            <Route path="FORC/:id" element={<OrdenCompraDetalle />} />
            <Route path="MSUP" element={<Proveedores />} />
            <Route path="MSUP/:codigo" element={<ProveedorDetalle />} />
            <Route path="MBanco" element={<Bancos />} />
            <Route path="MCuentaBanco" element={<CuentasBancarias />} />
            <Route path="MUnidadMedida" element={<UnidadesMedida />} />
            <Route path="MCategoria" element={<CategoriasArticulo />} />
            <Route path="MFamilia" element={<FamiliasArticulo />} />
            <Route path="MMarca" element={<Proximamente modulo="Marcas" codigo="MMarca" />} />
            <Route path="MAtributo" element={<Proximamente modulo="Atributos" codigo="MAtributo" />} />
            <Route path="MPaquete" element={<Proximamente modulo="Paquetes" codigo="MPaquete" />} />
            <Route path="MReceta" element={<Recetas />} />
            <Route path="MAutomatizacion" element={<Automatizaciones />} />
            <Route path="MPerfil" element={<MiPerfil />} />
            <Route path="FSPA" element={<SolicitudPago />} />
            <Route path="FSPA/nuevo" element={<SolicitudPagoFormulario />} />
            <Route path="FSPA/:id/editar" element={<SolicitudPagoFormulario />} />
            <Route path="FSPA/:id" element={<SolicitudPagoDetalle />} />
          <Route path="ORepostear" element={<Repostear />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="notificaciones/config" element={<NotificacionesConfig />} />
          </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
