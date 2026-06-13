import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TipoCuentaDTO } from '../types/contabilidad';

const BASE = '/TipoCuenta';

export const tipoCuentaApi = {
  obtenerListado: async (sucursal: number): Promise<TipoCuentaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoCuentaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<TipoCuentaDTO> => {
    const { data } = await apiClient.get<ApiResponse<TipoCuentaDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<TipoCuentaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoCuentaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  crear: async (sucursal: number, dto: TipoCuentaDTO): Promise<TipoCuentaDTO> => {
    const { data } = await apiClient.post<ApiResponse<TipoCuentaDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, dto: TipoCuentaDTO): Promise<TipoCuentaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TipoCuentaDTO>>(`${BASE}/${sucursal}/${codigo}`, dto);
    return data.data;
  },
};
