export const Sucursal = {
  Consolidado: 0,
  Compra: 1,
  OrensePlaza: 2,
  HiperRomana: 3,
  OrenseVillaHermosa: 4,
  ElOfertazo: 5,
} as const;
export type Sucursal = (typeof Sucursal)[keyof typeof Sucursal];

export interface AuthLoginRequest {
  nombreUsuario: string;
  contrasena: string;
  equipo: string;
  ip: string;
  sucursal: Sucursal;
}

export interface AuthRefreshRequest {
  refreshToken: string;
  equipo: string;
  ip: string;
  sucursal: Sucursal;
}

export interface AuthSucursalPermitidaDTO {
  sucursal: Sucursal;
  nombre: string;
}

export interface RolDTO {
  id: number;
  nombre: string;
}

export interface ModuloDTO {
  id: number;
  nombre: string;
}

export interface PantallaDTO {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  esReporte: boolean;
  moduloID: number;
  modulos: ModuloDTO[];
  acciones: string[];
}

export interface AuthPermisoEspecialDTO {
  id: number;
  codigo: string;
  valor: boolean;
}

export interface AuthUsuarioSesionDTO {
  id: number;
  nombre: string;
  nombreUsuario: string;
  debeCambiarClave: boolean;
  diasVigencia: number;
  activo: boolean;
  empleadoID: string;
  sucursalActiva: Sucursal;
  roles: RolDTO[];
  sucursalesRoles: UsuarioSucursalRolDTO[];
  pantallas: PantallaDTO[];
  permisosEspeciales: AuthPermisoEspecialDTO[];
}

export interface UsuarioSucursalRolDTO {
  sucursal: Sucursal;
  nombreSucursal: string;
  roles: RolDTO[];
}

export interface AuthSesionDTO {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiraEn: string;
  refreshTokenExpiraEn: string;
  sucursalActiva: Sucursal;
  sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  usuario: AuthUsuarioSesionDTO;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage: string;
}
