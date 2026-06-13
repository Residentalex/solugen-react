export const Sucursal = {
  OrensePlaza: 0,
  HiperRomana: 1,
  OrenseVillaHermosa: 2,
  ElOfertazo: 3,
  Consolidado: 4,
  Compra: 5,
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
  orden: number;
}

export interface PantallaEntidadDTO {
  id: number;
  entidadCodigo: string;
  entidadDescripcion?: string;
  tipoEntidad?: string;
  orden: number;
}

export interface PantallaDTO {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  esReporte: boolean;
  activo?: boolean;
  tipo?: string;
  orden: number;
  pantallaPadreID?: number;
  grupo?: string;
  modulos: ModuloDTO[];
  acciones: string[];
  permisosEspeciales?: string[];
  accionesPorSucursal?: Record<number, string[]>;
  sucursalesAutorizadas?: AuthSucursalPermitidaDTO[];
  entidades?: PantallaEntidadDTO[];
}

export interface PantallaConEntidadesDTO extends PantallaDTO {
  entidades: PantallaEntidadDTO[];
}

export interface EntidadDocumentoDTO {
  entdocId: number;
  codigo: string;
  descripcion: string;
}

export interface AuthPermisoEspecialDTO {
  id: number;
  codigo: string;
  nombre?: string;
  activo: boolean;
  valor: boolean;
}

export interface PermisoEspecialRequestDTO {
  id: number;
  codigo: string;
  nombre?: string;
  activo: boolean;
}

export interface PermisoEspecialConAsignacionDTO {
  id: number;
  codigo: string;
  nombre?: string;
  activo: boolean;
  asignado: boolean;
}

export interface PermisoEspecialConRolDTO {
  id: number;
  codigo: string;
  nombre?: string;
  activo: boolean;
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
  empleado: string;
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
  sucursalContable: Sucursal;
  sucursalesPermitidas: AuthSucursalPermitidaDTO[];
  usuario: AuthUsuarioSesionDTO;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage: string;
}
