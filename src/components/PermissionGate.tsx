import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

interface PermissionGateProps {
  codigoPantalla?: string;
  accion: string;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ codigoPantalla, accion, children }) => {
  const usuario = useAuthStore((s) => s.usuario);
  const activeModule = useUIStore((s) => s.activeModule);

  const codigo = codigoPantalla || activeModule;

  if (!usuario || !codigo) {
    return null;
  }

  const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === codigo?.toUpperCase());
  if (!pantalla) {
    return null;
  }

  const tienePermiso = pantalla.acciones.includes(accion);
  if (!tienePermiso) {
    return null;
  }

  return <>{children}</>;
};

export default PermissionGate;
