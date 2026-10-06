import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AlmacenDTO, ExistenciaDTO } from '../types/entradaAlmacen';

const BASE = '/Almacen';

export const almacenApi = {
  obtenerListado: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<AlmacenDTO> => {
    const { data } = await apiClient.get<AlmacenDTO>(`${BASE}/${sucursal}/codigo/${codigo}`);
    return data;
  },

  crear: async (sucursal: number, almacen: Partial<AlmacenDTO>): Promise<AlmacenDTO> => {
    const { data } = await apiClient.post<ApiResponse<AlmacenDTO>>(`${BASE}/${sucursal}`, almacen);
    return data.data;
  },

  actualizar: async (
    sucursal: number,
    codigo: string,
    almacen: Partial<AlmacenDTO>
  ): Promise<AlmacenDTO> => {
    const { data } = await apiClient.put<ApiResponse<AlmacenDTO>>(`${BASE}/${sucursal}/${codigo}`, almacen);
    return data.data;
  },

  obtenerExistencias: async (
    sucursal: number,
    codigo: string,
    params: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<ExistenciaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ExistenciaDTO[]>>(
      `/Existencia/almacen/${sucursal}/${codigo}`,
      { params }
    );
    return data.data;
  },

  obtenerTotalExistencias: async (
    sucursal: number,
    codigo: string,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(
      `/Existencia/almacen/total/${sucursal}/${codigo}`,
      { params }
    );
    return data.data;
  },
};