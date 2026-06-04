export interface TicketDTO {
  id: number;
  numero?: string;
  titulo: string;
  mensaje: string;
  estado: string;         // 'Abierto' | 'EnProceso' | 'Resuelto' | 'Cerrado'
  prioridad: string;      // 'Baja' | 'Normal' | 'Alta'
  modulo?: string;
  sucursalID: number;
  usuarioOrigenID: number;
  usuarioAsignadoID?: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
  activo: boolean;
  respuestas: TicketRespuestaDTO[];
}

export interface TicketRespuestaDTO {
  id: number;
  ticketID: number;
  usuarioID: number;
  mensaje: string;
  fechaCreacion: string;
}

export interface CrearTicketRequest {
  titulo: string;
  mensaje: string;
  prioridad: string;
  modulo?: string;
  usuarioOrigenID: number;
  usuarioAsignadoID: number;
}

export interface ResponderTicketRequest {
  usuarioID: number;
  mensaje: string;
}

export interface CambiarEstadoTicketRequest {
  estado: string;
  usuarioID: number;
}
