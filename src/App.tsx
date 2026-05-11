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
         </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
