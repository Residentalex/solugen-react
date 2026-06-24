import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ImpuestoDTO } from '../types/contabilidad';

const BASE = '/Impuesto';

export const impuestoApi = {
  obtenerListado: async (sucursal: number): Promise<ImpuestoDTO[]> => {
    const { data } = await apiClient.get<ImpuestoDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ImpuestoDTO> => {
    const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ items: ImpuestoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<ImpuestoDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  crear: async (sucursal: number, dto: Partial<ImpuestoDTO>): Promise<ImpuestoDTO> => {
    const { data } = await apiClient.post<ApiResponse<ImpuestoDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, dto: Partial<ImpuestoDTO>): Promise<ImpuestoDTO> => {
    const { data } = await apiClient.put<ApiResponse<ImpuestoDTO>>(`${BASE}/${sucursal}/${codigo}`, dto);
    return data.data;
  },

  eliminar: async (sucursal: number, codigo: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${codigo}`);
  },
};
