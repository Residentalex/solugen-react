import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CategoriaArticuloDTO } from '../types/productos';

const BASE = '/CategoriaArticulo';

export const categoriaArticuloApi = {
  obtenerListado: async (sucursal: number): Promise<CategoriaArticuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<CategoriaArticuloDTO> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<CategoriaArticuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },
};
