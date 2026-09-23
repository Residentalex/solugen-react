import React from 'react';
import { useAuthStore } from '../stores/authStore';

interface PermissionEspecialGateProps {
  permiso: string;          // Código del permiso (ej: "PUEDE_ANULAR", "VER_COSTOS")
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionEspecialGate: React.FC<PermissionEspecialGateProps> = ({ permiso, children, fallback }) => {
  const usuario = useAuthStore((s) => s.usuario);

  if (!usuario || !permiso) {
    return null;
  }

  const tienePermiso = usuario.permisosEspeciales?.some(
    (p) => p.codigo?.toUpperCase() === permiso.toUpperCase() && p.valor === true
  );

  if (!tienePermiso) {
    return fallback !== undefined ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

export default PermissionEspecialGate;
