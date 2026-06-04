export interface ChatConversacionListDTO {
  id: number;
  titulo: string;
  tipo: string;
  ultimoMensaje: string;
  ultimaFecha: string | null;
  ultimoMensajeRemitenteID: number | null;
  ultimoMensajeRemitente: string;
  noLeidos: number;
  participantes: ChatParticipanteDTO[];
}

export interface ChatMensajeDTO {
  id: number;
  conversacionID: number;
  remitenteID: number;
  remitenteNombre: string;
  contenido: string;
  fechaEnvio: string;
  editado: boolean;
  fechaEdicion: string | null;
  eliminado: boolean;
}

export interface ChatParticipanteDTO {
  usuarioID: number;
  nombre: string;
}

export interface ChatEnviarMensajeRequest {
  contenido: string;
}

export interface ChatCrearConversacionRequest {
  titulo: string;
  tipo: string;
  participantes: number[];
}
