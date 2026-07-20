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

export interface ChatAdjuntoDTO {
  id: number;
  mensajeID: number;
  nombreArchivo: string;
  tipoMime: string | null;
  tamano: number | null;
  fechaCreacion: string;
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
  adjuntos: ChatAdjuntoDTO[];
  mensajePadreID: number | null;
  mensajePadreContenido: string | null;
  mensajePadreRemitente: string | null;
}

export interface ChatParticipanteDTO {
  usuarioID: number;
  nombre: string;
}

export interface ChatEnviarMensajeRequest {
  contenido: string;
  mensajePadreID?: number | null;
}

export interface ChatCrearConversacionRequest {
  titulo: string;
  tipo: string;
  participantes: number[];
}
