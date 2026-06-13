import { apiClient } from './client';
import type { ClienteDTO } from '../types/facturacion';
import type { ApiResponse } from '../types/auth';

const BASE = '/Cliente';

export const clienteApi = {
  obtenerListado: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ClienteDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { codigo?: string; activo?: boolean }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  obtenerActivos: async (sucursal: number): Promise<ClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ClienteDTO[]>>(`${BASE}/${sucursal}/activos`);
    return data.data;
  },

  obtenerPorCodigo: async (
    sucursal: number,
    codigo: string,
    signal?: AbortSignal
  ): Promise<ClienteDTO> => {
    const { data } = await apiClient.get<ApiResponse<ClienteDTO>>(`${BASE}/${sucursal}/${codigo}`, { signal });
    return data.data;
  },

  crear: async (sucursal: number, cliente: ClienteDTO): Promise<ClienteDTO> => {
    const { data } = await apiClient.post<ApiResponse<ClienteDTO>>(`${BASE}/${sucursal}`, cliente);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ClienteDTO[]> => {
    const params: Record<string, string | number | boolean> = {};
    if (filtro.cantidad != null) params.cantidad = filtro.cantidad;
    if (filtro.salto != null) params.salto = filtro.salto;
    if (filtro.codigo) params.codigo = filtro.codigo;
    if (filtro.activo !== undefined) params.activo = filtro.activo;

    const { data } = await apiClient.get<ApiResponse<ClienteDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  actualizar: async (sucursal: number, cliente: ClienteDTO): Promise<ClienteDTO> => {
    const { data } = await apiClient.put<ApiResponse<ClienteDTO>>(`${BASE}/${sucursal}`, cliente);
    return data.data;
  },
};
