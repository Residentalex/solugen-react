import type { RolDTO, PantallaDTO, AuthPermisoEspecialDTO, UsuarioSucursalRolDTO } from './auth';

export interface AccionDTO {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface RolFullDTO {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  pantallas: PantallaDTO[];
  cantidadUsuarios?: number;
  nombresUsuarios?: string[];
}

export interface UsuarioDTO {
  id: number;
  nombre: string;
  nombreUsuario: string;
  contrasena?: string;
  activo: boolean;
  debeCambiarClave: boolean;
  diasVigencia: number;
  empleadoID?: string;
  ultimoLogin?: string;
  roles: RolDTO[];
  sucursalesRoles: UsuarioSucursalRolDTO[];
  pantallas: PantallaDTO[];
  permisosEspeciales: AuthPermisoEspecialDTO[];
}

export interface CrearUsuarioRequest {
  nombre: string;
  nombreUsuario: string;
  contrasena?: string;
  activo: boolean;
  debeCambiarClave?: boolean;
  diasVigencia: number;
  empleadoID?: string;
  roles: { sucursal: number; rolID: number }[];
}

export interface CambiarEstadoRequest {
  activo: boolean;
}
