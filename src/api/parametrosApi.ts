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

  obtenerSucursalContable: async (sucursal: number): Promise<number | null> => {
    const { data } = await apiClient.get<ApiResponse<number | null>>(`${BASE}/${sucursal}/sucursal-contable`);
    if (!data.isSuccess) throw new Error(data.errorMessage || 'Error al obtener sucursal contable');
    return data.data ?? null;
  },
};
