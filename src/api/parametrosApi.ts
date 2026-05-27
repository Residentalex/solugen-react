import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/Parametros';

export const parametrosApi = {
  obtenerFechaCierre: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.get<ApiResponse<string>>(`${BASE}/${sucursal}/FechaCierre`);
    return data.data;
  },

  obtenerFechaCierreFiscal: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.get<ApiResponse<string>>(`${BASE}/${sucursal}/FechaCierreFiscal`);
    return data.data;
  },

  obtenerFechaCierreInventario: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.get<string>(`${BASE}/${sucursal}/FechaCierreINV`);
    return data;
  },
};
