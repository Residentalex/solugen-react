import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { FamiliaArticuloDTO } from '../types/productos';

const BASE = '/FAM';

export const familiaArticuloApi = {
  obtenerTodo: async (sucursal: number): Promise<FamiliaArticuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<FamiliaArticuloDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtener: async (sucursal: number, codigo: string): Promise<FamiliaArticuloDTO> => {
    const { data } = await apiClient.get<FamiliaArticuloDTO>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },
};
