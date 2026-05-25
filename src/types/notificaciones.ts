export interface NotificacionVista {
  id: number;
  notificacionUsuarioID: number;
  titulo: string;
  mensaje: string;
  modulo: string;
  tipo: string;
  fechaCreacion: string;
  leida: boolean;
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
  paraUsuarioID: number;
  titulo: string;
  mensaje: string;
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
