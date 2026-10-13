import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PosicionDTO } from '../types/posicion';

const BASE = '/Posicion';

export const posicionApi = {
  obtenerListado: async (sucursal: number): Promise<PosicionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PosicionDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<PosicionDTO> => {
    const { data } = await apiClient.get<ApiResponse<PosicionDTO>>(`${BASE}/${sucursal}/codigo/${encodeURIComponent(codigo)}`);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ datos: PosicionDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<PosicionDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return { datos: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerTotal: async (sucursal: number, params?: { busqueda?: string }): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/${sucursal}/total`, { params });
    return data.data;
  },

  crear: async (sucursal: number, posicion: PosicionDTO): Promise<PosicionDTO> => {
    const { data } = await apiClient.post<ApiResponse<PosicionDTO>>(`${BASE}/${sucursal}`, posicion);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, posicion: PosicionDTO): Promise<PosicionDTO> => {
    const { data } = await apiClient.put<ApiResponse<PosicionDTO>>(`${BASE}/${sucursal}/${encodeURIComponent(codigo)}`, posicion);
    return data.data;
  },

  eliminar: async (sucursal: number, codigo: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${encodeURIComponent(codigo)}`);
  },
};
