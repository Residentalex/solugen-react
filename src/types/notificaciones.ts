export interface NotificacionVista {
  id: number;
  notificacionUsuarioID: number;
  titulo: string;
  mensaje: string;
  modulo: string;
  tipo: string;
  fechaCreacion: string;
  leida: boolean;
  urlAccion?: string;
  referenciaID?: number;
  referenciaTipo?: string;
}

export interface NotificacionConfig {
  configID: number;
  modulo: string;
  evento: string;
  tipo: string;
  tituloTemplate?: string;
  mensajeTemplate?: string;
  activa: boolean;
  fechaCreacion: string;
  destinos: NotificacionConfigDestino[];
}

export interface NotificacionConfigDestino {
  id: number;
  configID: number;
  destinoTipo: string; // "Usuario" | "Rol"
  destinoID: number;
}

export interface EnviarNotificacionRequest {
  deUsuarioID: number;
  paraUsuariosID: number[];
  titulo: string;
  mensaje: string;
  tipo?: string;
}

export interface NotificacionSignalR {
  id: number;
  notificacionUsuarioID: number;
  titulo: string;
  mensaje: string;
  modulo: string;
  tipo: string;
  fechaCreacion: string;
  leida: boolean;
}

/* ── Notificaciones Personalizadas SQL ── */

export interface NotificacionSQLConfig {
  id: number;
  sucursalIDs?: string; // "0,1,2"
  nombre: string;
  sqlConsulta: string;
  columnaTitulo?: string;
  columnaMensaje?: string;
  tipo: string;
  activo: boolean;
  intervaloMinutos: number;
  ultimaEjecucion?: string;
  fechaCreacion: string;
  creadoPor?: number;
  destinos: NotificacionConfigDestino[];
}

export interface NotificacionSQLRequest {
  nombre: string;
  sqlConsulta: string;
  sucursalIDs?: string; // "0,1,2"
  columnaTitulo?: string;
  columnaMensaje?: string;
  tipo: string;
  activo: boolean;
  intervaloMinutos: number;
  destinos: { destinoTipo: string; destinoID: number }[];
}
