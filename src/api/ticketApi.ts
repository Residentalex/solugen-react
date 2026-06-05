import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TicketDTO, TicketRespuestaDTO, CrearTicketRequest, ResponderTicketRequest, CambiarEstadoTicketRequest } from '../types/ticket';

const BASE = '/ticket';

export const ticketApi = {
  crear: async (sucursal: number, request: CrearTicketRequest): Promise<TicketDTO> => {
    const { data } = await apiClient.post<ApiResponse<TicketDTO>>(`${BASE}/${sucursal}/crear`, request);
    return data.data;
  },

  obtener: async (sucursal: number, ticketID: number): Promise<TicketDTO> => {
    const { data } = await apiClient.get<ApiResponse<TicketDTO>>(`${BASE}/${sucursal}/${ticketID}`);
    return data.data;
  },

  responder: async (sucursal: number, ticketID: number, request: ResponderTicketRequest): Promise<TicketRespuestaDTO> => {
    const { data } = await apiClient.post<ApiResponse<TicketRespuestaDTO>>(`${BASE}/${sucursal}/${ticketID}/responder`, request);
    return data.data;
  },

  cambiarEstado: async (sucursal: number, ticketID: number, request: CambiarEstadoTicketRequest): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${ticketID}/estado`, request);
  },

  obtenerPendientes: async (sucursal: number, usuarioID: number, cantidad?: number, salto?: number): Promise<TicketDTO[]> => {
    const params: Record<string, number> = {};
    if (cantidad !== undefined) params.cantidad = cantidad;
    if (salto !== undefined) params.salto = salto;
    const { data } = await apiClient.get<ApiResponse<TicketDTO[]>>(`${BASE}/${sucursal}/pendientes/${usuarioID}`, { params });
    return data.data;
  },
};
