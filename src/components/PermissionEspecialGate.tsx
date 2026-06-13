import React from 'react';
import { useAuthStore } from '../stores/authStore';

interface PermissionEspecialGateProps {
  permiso: string;          // Código del permiso (ej: "PUEDE_ANULAR", "VER_COSTOS")
  children: React.ReactNode;
}

const PermissionEspecialGate: React.FC<PermissionEspecialGateProps> = ({ permiso, children }) => {
  const usuario = useAuthStore((s) => s.usuario);

  if (!usuario || !permiso) {
    return null;
  }

  const tienePermiso = usuario.permisosEspeciales?.some(
    (p) => p.codigo?.toUpperCase() === permiso.toUpperCase() && p.valor === true
  );

  if (!tienePermiso) {
    return null;
  }

  return <>{children}</>;
};

export default PermissionEspecialGate;
