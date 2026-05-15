import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login/Login';
import CambiarClave from './pages/CambiarClave/CambiarClave';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaAlmacen from './pages/EntradaAlmacen/EntradaAlmacen';
import EntradaAlmacenDetalle from './pages/EntradaAlmacen/EntradaAlmacenDetalle';
import SalidaAlmacen from './pages/SalidaAlmacen/SalidaAlmacen';
import SalidaAlmacenDetalle from './pages/SalidaAlmacen/SalidaAlmacenDetalle';
import DevolucionCompra from './pages/DevolucionCompra/DevolucionCompra';
import DevolucionCompraDetalle from './pages/DevolucionCompra/DevolucionCompraDetalle';
import TransferenciaAlmacen from './pages/TransferenciaAlmacen/TransferenciaAlmacen';
import TransferenciaAlmacenDetalle from './pages/TransferenciaAlmacen/TransferenciaAlmacenDetalle';
import DevolucionVenta from './pages/DevolucionVenta/DevolucionVenta';
import CotizacionVenta from './pages/CotizacionVenta/CotizacionVenta';
import FacturaPOS from './pages/FacturaPOS/FacturaPOS';
import FacturaCliente from './pages/FacturaCliente/FacturaCliente';
import FacturaSuplidor from './pages/FacturaSuplidor/FacturaSuplidor';
import FacturaSuplidorDetalle from './pages/FacturaSuplidor/FacturaSuplidorDetalle';
import NotaDebito from './pages/NotaDebito/NotaDebito';
import NotaDebitoDetalle from './pages/NotaDebito/NotaDebitoDetalle';
import NotaCredito from './pages/NotaCredito/NotaCredito';
import NotaCreditoDetalle from './pages/NotaCredito/NotaCreditoDetalle';
import DistribucionBalance from './pages/DistribucionBalance/DistribucionBalance';
import DistribucionBalanceDetalle from './pages/DistribucionBalance/DistribucionBalanceDetalle';
import ReciboIngreso from './pages/ReciboIngreso/ReciboIngreso';
import ReciboIngresoDetalle from './pages/ReciboIngreso/ReciboIngresoDetalle';
import Usuarios from './pages/Usuarios/Usuarios';
import UsuarioDetalle from './pages/Usuarios/UsuarioDetalle';
import Roles from './pages/Roles/Roles';
import Productos from './pages/Productos/Productos';
import Monedas from './pages/Monedas/Monedas';
import CFacturasElectronicas from './pages/DGII/CFacturasElectronicas';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
            <Route path="FENP" element={<EntradaAlmacen />} />
            <Route path="FENP/:id" element={<EntradaAlmacenDetalle />} />
            <Route path="FSAP" element={<SalidaAlmacen />} />
            <Route path="FSAP/:id" element={<SalidaAlmacenDetalle />} />
           <Route path="FDVC" element={<DevolucionCompra />} />
            <Route path="FDVC/:id" element={<DevolucionCompraDetalle />} />
           <Route path="FTRP" element={<TransferenciaAlmacen />} />
            <Route path="FTRP/:id" element={<TransferenciaAlmacenDetalle />} />
            <Route path="FDEV" element={<DevolucionVenta />} />
            <Route path="FCotizacion" element={<CotizacionVenta />} />
            <Route path="FPV" element={<FacturaPOS />} />
            <Route path="FFAC" element={<FacturaCliente />} />
            <Route path="FRDE" element={<FacturaSuplidor />} />
            <Route path="FRDE/:id" element={<FacturaSuplidorDetalle />} />
            <Route path="FNDSUP" element={<NotaDebito tipoEntidad="SUP" />} />
            <Route path="FNDSUP/:id" element={<NotaDebitoDetalle tipoEntidad="SUP" />} />
            <Route path="FNDCLI" element={<NotaDebito tipoEntidad="CLI" />} />
            <Route path="FNDCLI/:id" element={<NotaDebitoDetalle tipoEntidad="CLI" />} />
            <Route path="FNCSUP" element={<NotaCredito tipoEntidad="SUP" />} />
            <Route path="FNCSUP/:id" element={<NotaCreditoDetalle tipoEntidad="SUP" />} />
            <Route path="FNCCLI" element={<NotaCredito tipoEntidad="CLI" />} />
            <Route path="FNCCLI/:id" element={<NotaCreditoDetalle tipoEntidad="CLI" />} />
            <Route path="FDBASUP" element={<DistribucionBalance tipoEntidad="SUP" />} />
            <Route path="FDBASUP/:id" element={<DistribucionBalanceDetalle tipoEntidad="SUP" />} />
            <Route path="FDBACLI" element={<DistribucionBalance tipoEntidad="CLI" />} />
            <Route path="FDBACLI/:id" element={<DistribucionBalanceDetalle tipoEntidad="CLI" />} />
            <Route path="FRI" element={<ReciboIngreso />} />
            <Route path="FRI/:id" element={<ReciboIngresoDetalle />} />
            <Route path="MUsuario" element={<Usuarios />} />
            <Route path="MUsuario/:id" element={<UsuarioDetalle />} />
            <Route path="MROL" element={<Roles />} />
            <Route path="MProducto" element={<Productos />} />
            <Route path="MMoneda" element={<Monedas />} />
            <Route path="CFacturasElectronicas" element={<CFacturasElectronicas />} />
          </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
