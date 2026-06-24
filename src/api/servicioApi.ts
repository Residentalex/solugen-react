import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ServicioDTO, ServicioVistaDTO } from '../types/servicio';

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
  obtenerVista: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; codigo?: string; nombre?: string; activo?: boolean }
  ): Promise<{ items: ServicioVistaDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<ServicioVistaDTO[]>>(`${BASE}/${sucursal}/vista`, { params });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },
  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string; activo?: boolean }
  ): Promise<ServicioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },
};
