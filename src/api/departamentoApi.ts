import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DepartamentoDTO } from '../types/departamento';

const BASE = '/Departamento';

export const departamentoApi = {
  obtenerListado: async (sucursal: number): Promise<DepartamentoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DepartamentoDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<DepartamentoDTO> => {
    const { data } = await apiClient.get<ApiResponse<DepartamentoDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ datos: DepartamentoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<DepartamentoDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return { datos: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerTotal: async (sucursal: number, params?: { busqueda?: string }): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  crear: async (sucursal: number, departamento: DepartamentoDTO): Promise<DepartamentoDTO> => {
    const { data } = await apiClient.post<ApiResponse<DepartamentoDTO>>(`${BASE}/${sucursal}`, departamento);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, departamento: DepartamentoDTO): Promise<DepartamentoDTO> => {
    const { data } = await apiClient.put<ApiResponse<DepartamentoDTO>>(`${BASE}/${sucursal}/${codigo}`, departamento);
    return data.data;
  },

  eliminar: async (sucursal: number, codigo: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${codigo}`);
  },
};
