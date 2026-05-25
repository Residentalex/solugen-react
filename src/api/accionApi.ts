import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AccionDTO } from '../types/administracion';

const BASE = '/Accion';

export const accionApi = {
  obtenerListado: async (sucursal: number): Promise<AccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AccionDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<AccionDTO> => {
    const { data } = await apiClient.get<ApiResponse<AccionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, accion: AccionDTO): Promise<AccionDTO> => {
    const { data } = await apiClient.post<ApiResponse<AccionDTO>>(`${BASE}/${sucursal}`, accion);
    return data.data;
  },

  actualizar: async (sucursal: number, id: number, accion: AccionDTO): Promise<AccionDTO> => {
    const { data } = await apiClient.put<ApiResponse<AccionDTO>>(`${BASE}/${sucursal}/${id}`, accion);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
