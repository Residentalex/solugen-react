// DTOs para el módulo de Monitoreo de Cajas POS
// Coincide con el backend MonitoreoCajaDTO

export interface ConnectionStringsDTO {
  serverConnection: string;
  clientConnection: string;
  rncConnection: string;
  rncClienteConnection: string;
}

export interface MonitoreoCajaDTO {
  ip: string;
  noCaja: string;
  nombre: string;
  version: string;
  sucursal: number;
  sucursalNombre?: string;
  conectado: boolean;
  delayTime: string;
  connectionStrings: ConnectionStringsDTO;
  ultimaActualizacion: string;
  updaterServiceStatus?: string;
}

export interface ConfigurarCajaRequest {
  noCaja: string;
  version: string;
  delayTime: string;
  connectionStrings: ConnectionStringsDTO;
  syncAll?: boolean;
  ip?: string;
  updaterServiceStatus?: string;
}

export interface SincronizarRequest {
  tipos: string[];
  syncAll: boolean;
}

export const TIPOS_SINCRONIZACION = [
  { label: 'RNC', value: 'RNC' },
  { label: 'Productos', value: 'PRO' },
  { label: 'Ofertas', value: 'OFE' },
  { label: 'Clientes', value: 'CLI' },
  { label: 'Usuarios', value: 'USU' },
] as const;
