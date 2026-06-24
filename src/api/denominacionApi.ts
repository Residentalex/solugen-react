import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DenominacionDTO } from '../types/denominacion';

const BASE = '/Denominacion';

export const denominacionApi = {
  listarTodo: async (sucursal: number): Promise<DenominacionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DenominacionDTO[]>>(`${BASE}/${sucursal}`);
    return data.data ?? [];
  },

  obtenerPorID: async (sucursal: number, id: number): Promise<DenominacionDTO> => {
    const { data } = await apiClient.get<ApiResponse<DenominacionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, dto: DenominacionDTO): Promise<DenominacionDTO> => {
    const { data } = await apiClient.post<ApiResponse<DenominacionDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, dto: DenominacionDTO): Promise<DenominacionDTO> => {
    const { data } = await apiClient.put<ApiResponse<DenominacionDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
