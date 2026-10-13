import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { SucursalCatalogoDTO } from '../types/sucursal';

const BASE = '/Sucursales';

export const sucursalApi = {
  listar: async (): Promise<SucursalCatalogoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SucursalCatalogoDTO[]>>(`${BASE}`);
    return data.data;
  },

  filtrar: async (
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ items: SucursalCatalogoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<SucursalCatalogoDTO[]>>(`${BASE}/filtrar`, { params: filtro });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerPorCodigo: async (codigo: string): Promise<SucursalCatalogoDTO> => {
    const { data } = await apiClient.get<ApiResponse<SucursalCatalogoDTO>>(`${BASE}/codigo/${encodeURIComponent(codigo)}`);
    return data.data;
  },

  crear: async (dto: SucursalCatalogoDTO): Promise<SucursalCatalogoDTO> => {
    const { data } = await apiClient.post<ApiResponse<SucursalCatalogoDTO>>(`${BASE}`, dto);
    return data.data;
  },

  actualizar: async (codigo: string, dto: SucursalCatalogoDTO): Promise<SucursalCatalogoDTO> => {
    const { data } = await apiClient.put<ApiResponse<SucursalCatalogoDTO>>(`${BASE}/${encodeURIComponent(codigo)}`, dto);
    return data.data;
  },

  eliminar: async (codigo: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${encodeURIComponent(codigo)}`);
  },
};
