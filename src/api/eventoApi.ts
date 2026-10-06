import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { EventoInventarioDTO } from '../types/evento';

const BASE = '/Evento';

export const eventoApi = {
  obtenerListado: async (sucursal: number, tipo?: string): Promise<EventoInventarioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EventoInventarioDTO[]>>(`${BASE}/${sucursal}`, {
      params: tipo ? { tipo } : undefined,
    });
    return data.data;
  },
};