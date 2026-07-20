import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ChatConversacionListDTO, ChatMensajeDTO, ChatEnviarMensajeRequest, ChatCrearConversacionRequest, ChatParticipanteDTO } from '../types/chat';

const BASE = '/Chat';

export const chatApi = {
  obtenerConversaciones: async (): Promise<ChatConversacionListDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ChatConversacionListDTO[]>>(`${BASE}/conversaciones`);
    return data.data;
  },

  obtenerMensajes: async (conversacionId: number, cantidad = 50, salto = 0): Promise<ChatMensajeDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ChatMensajeDTO[]>>(
      `${BASE}/conversaciones/${conversacionId}/mensajes`,
      { params: { cantidad, salto } }
    );
    return data.data;
  },

  obtenerMensajesRecientes: async (conversacionId: number, ultimoId: number): Promise<ChatMensajeDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ChatMensajeDTO[]>>(
      `${BASE}/conversaciones/${conversacionId}/mensajes/recientes`,
      { params: { ultimoId } }
    );
    return data.data;
  },

  enviarMensaje: async (conversacionId: number, request: ChatEnviarMensajeRequest): Promise<ChatMensajeDTO> => {
    const { data } = await apiClient.post<ApiResponse<ChatMensajeDTO>>(
      `${BASE}/conversaciones/${conversacionId}/mensajes`,
      request
    );
    return data.data;
  },

  crearConversacion: async (request: ChatCrearConversacionRequest): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`${BASE}/conversaciones`, request);
    return data.data;
  },

  marcarLeido: async (conversacionId: number): Promise<void> => {
    await apiClient.post(`${BASE}/conversaciones/${conversacionId}/leer`);
  },

  eliminarConversacion: async (conversacionId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/conversaciones/${conversacionId}`);
  },

  contarNoLeidos: async (): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/no-leidos`);
    return data.data;
  },

  buscarUsuarios: async (nombre?: string): Promise<ChatParticipanteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ChatParticipanteDTO[]>>(`${BASE}/usuarios`, {
      params: { nombre: nombre || '' },
    });
    return data.data;
  },

  subirAdjunto: async (conversacionId: number, file: File): Promise<ChatMensajeDTO> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await apiClient.post<ApiResponse<ChatMensajeDTO>>(
      `${BASE}/conversaciones/${conversacionId}/adjuntos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  descargarAdjunto: async (adjuntoId: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `${BASE}/adjuntos/${adjuntoId}/descargar`,
      { responseType: 'blob' },
    );
    return data;
  },
};
