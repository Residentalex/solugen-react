import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

interface PermissionGateProps {
  codigoPantalla?: string;
  accion?: string;
  permisoEspecial?: string;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ codigoPantalla, accion, permisoEspecial, children }) => {
  const usuario = useAuthStore((s) => s.usuario);
  const activeModule = useUIStore((s) => s.activeModule);

  if (!usuario) {
    return null;
  }

  // Si se pasa permisoEspecial, verifica contra permisosEspeciales del usuario
  if (permisoEspecial) {
    const permiso = usuario.permisosEspeciales?.find(
      (p) => p.codigo?.toUpperCase() === permisoEspecial.toUpperCase()
    );
    if (!permiso) return null;

    // BOOLEANO: valor debe ser true
    // NUMERICO: valorNumerico debe ser > 0
    const activo = permiso.tipoValor === 'NUMERICO'
      ? (permiso.valorNumerico ?? 0) > 0
      : permiso.valor === true;

    if (!activo) return null;
    return <>{children}</>;
  }

  // Si no hay permisoEspecial pero tampoco accion, no se puede verificar
  if (!accion) {
    return null;
  }

  // Compatibilidad hacia atrás: verifica accion contra la pantalla
  const codigo = codigoPantalla || activeModule;

  if (!codigo) {
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
