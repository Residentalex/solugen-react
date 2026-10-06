import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { MarcaDTO } from '../types/marca';

const BASE = '/Marca';

export const marcaApi = {
  obtenerListado: async (sucursal: number): Promise<MarcaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MarcaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<MarcaDTO> => {
    const { data } = await apiClient.get<ApiResponse<MarcaDTO>>(`${BASE}/${sucursal}/codigo/${encodeURIComponent(codigo)}`);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ items: MarcaDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<MarcaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerTotal: async (sucursal: number, params?: { busqueda?: string }): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  crear: async (sucursal: number, marca: MarcaDTO): Promise<MarcaDTO> => {
    const { data } = await apiClient.post<ApiResponse<MarcaDTO>>(`${BASE}/${sucursal}`, marca);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, marca: MarcaDTO): Promise<MarcaDTO> => {
    const { data } = await apiClient.put<ApiResponse<MarcaDTO>>(`${BASE}/${sucursal}/${encodeURIComponent(codigo)}`, marca);
    return data.data;
  },

  eliminar: async (sucursal: number, codigo: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${encodeURIComponent(codigo)}`);
  },
};
