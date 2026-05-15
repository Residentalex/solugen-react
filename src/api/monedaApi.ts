import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { MonedaDTO } from '../types/contabilidad';

const BASE = '/Moneda';

export const monedaApi = {
  obtenerListado: async (sucursal: number): Promise<MonedaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MonedaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<MonedaDTO> => {
    const { data } = await apiClient.get<ApiResponse<MonedaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, moneda: MonedaDTO): Promise<MonedaDTO> => {
    const { data } = await apiClient.post<ApiResponse<MonedaDTO>>(`${BASE}/${sucursal}`, moneda);
    return data.data;
  },

  actualizar: async (sucursal: number, id: number, moneda: MonedaDTO): Promise<MonedaDTO> => {
    const { data } = await apiClient.put<ApiResponse<MonedaDTO>>(`${BASE}/${sucursal}/${id}`, moneda);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
