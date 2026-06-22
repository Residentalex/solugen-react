import { apiClient } from './client';
import type { ApiResponse, ModuloDTO } from '../types/auth';

const BASE = '/Modulo';

export const moduloApi = {
  obtenerTodo: async (sucursal: number): Promise<ModuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ModuloDTO[]>>(`${BASE}/${sucursal}`);
    return data.data || [];
  },

  crear: async (sucursal: number, dto: Partial<ModuloDTO>): Promise<ModuloDTO> => {
    const { data } = await apiClient.post<ApiResponse<ModuloDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, id: number, dto: Partial<ModuloDTO>): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
