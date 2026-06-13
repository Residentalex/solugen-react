import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AlmacenDTO } from '../types/entradaAlmacen';

const BASE = '/Almacen';

export const almacenApi = {
  obtenerListado: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },
};
