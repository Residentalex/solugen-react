import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { AuthUsuarioSesionDTO } from '../types/auth';

interface PermissionGateProps {
  codigoPantalla?: string;
  accion?: string;
  permisoEspecial?: string;
  children: React.ReactNode;
}

export interface VerificarPermisoArgs {
  usuario: AuthUsuarioSesionDTO | null;
  activeModule: string;
  codigoPantalla?: string;
  accion?: string;
  permisoEspecial?: string;
}

/**
 * Funcion pura de verificacion de permisos. Devuelve `true` cuando la accion
 * esta permitida para el usuario en la pantalla indicada (o en el modulo activo
 * cuando no se pasa `codigoPantalla`).
 */
export function verificarPermiso({
  usuario,
  activeModule,
  codigoPantalla,
  accion,
  permisoEspecial,
}: VerificarPermisoArgs): boolean {
  if (!usuario) {
    return false;
  }

  // Si se pasa permisoEspecial, verifica contra permisosEspeciales del usuario
  if (permisoEspecial) {
    const permiso = usuario.permisosEspeciales?.find(
      (p) => p.codigo?.toUpperCase() === permisoEspecial.toUpperCase()
    );
    if (!permiso) return false;

    // Si el permiso tiene pantallaId > 0, verificar que coincida con la pantalla actual
    if (permiso.pantallaId !== undefined && permiso.pantallaId > 0) {
      const codigo = codigoPantalla || activeModule;
      if (codigo) {
        const pantallaActual = usuario.pantallas.find(
          (p) => p.codigo?.toUpperCase() === codigo?.toUpperCase()
        );
        if (!pantallaActual || pantallaActual.id !== permiso.pantallaId) {
          return false;
        }
      }
    }

    // BOOLEANO: valor debe ser true
    // NUMERICO: valorNumerico debe ser > 0
    const activo = permiso.tipoValor === 'NUMERICO'
      ? (permiso.valorNumerico ?? 0) > 0
      : permiso.valor === true;

    return activo;
  }

  // Si no hay permisoEspecial pero tampoco accion, no se puede verificar
  if (!accion) {
    return false;
  }

  // Compatibilidad hacia atrás: verifica accion contra la pantalla
  const codigo = codigoPantalla || activeModule;

  if (!codigo) {
    return false;
  }

  const pantalla = usuario.pantallas.find((p) => p.codigo?.toUpperCase() === codigo?.toUpperCase());
  if (!pantalla) {
    return false;
  }

  return pantalla.acciones.includes(accion);
}

const PermissionGate: React.FC<PermissionGateProps> = ({ codigoPantalla, accion, permisoEspecial, children }) => {
  const usuario = useAuthStore((s) => s.usuario);
  const activeModule = useUIStore((s) => s.activeModule);

  if (!verificarPermiso({ usuario, activeModule, codigoPantalla, accion, permisoEspecial })) {
    return null;
  }

  return <>{children}</>;
};

export default PermissionGate;
