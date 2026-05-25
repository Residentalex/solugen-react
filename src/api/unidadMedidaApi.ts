import { apiClient } from './client';
import type { UnidadMedidaDTO } from '../types/productos';
import type { ApiResponse } from '../types/auth';

const BASE = '/MED';

export const unidadMedidaApi = {
  obtenerListado: async (sucursal: number): Promise<UnidadMedidaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<UnidadMedidaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<UnidadMedidaDTO> => {
    const { data } = await apiClient.get<UnidadMedidaDTO>(`${BASE}/${sucursal}/${id}`);
    return data;
  },

  crear: async (sucursal: number, medida: UnidadMedidaDTO): Promise<UnidadMedidaDTO> => {
    const { data } = await apiClient.post<ApiResponse<UnidadMedidaDTO>>(`${BASE}/${sucursal}`, medida);
    return data.data;
  },
};
