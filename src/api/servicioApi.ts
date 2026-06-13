import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ServicioDTO } from '../types/servicio';

const BASE = '/Servicio';

export const servicioApi = {
  obtenerListado: async (sucursal: number): Promise<ServicioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },
  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ServicioDTO> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },
  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string; activo?: boolean }
  ): Promise<ServicioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },
  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string; activo?: boolean }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },
};
