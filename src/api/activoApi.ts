import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ActivoDTO,
  ActivoCatalogosDTO,
  CrearActivoRequest,
  ActualizarActivoRequest,
} from '../types/activo';

const BASE = '/Activo';

export const activoApi = {
  filtrar: async (
    filtro: { cantidad?: number; salto?: number; busqueda?: string; retirado?: string }
  ): Promise<{ items: ActivoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<ActivoDTO[]>>(`${BASE}/filtrar`, { params: filtro });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerPorId: async (id: string): Promise<ActivoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ActivoDTO>>(`${BASE}/${id}`);
    return data.data;
  },

  catalogos: async (): Promise<ActivoCatalogosDTO> => {
    const { data } = await apiClient.get<ApiResponse<ActivoCatalogosDTO>>(`${BASE}/catalogos`);
    return data.data;
  },

  crear: async (activo: CrearActivoRequest): Promise<ActivoDTO> => {
    const { data } = await apiClient.post<ApiResponse<ActivoDTO>>(`${BASE}`, activo);
    return data.data;
  },

  actualizar: async (id: string, activo: ActualizarActivoRequest): Promise<ActivoDTO> => {
    const { data } = await apiClient.put<ApiResponse<ActivoDTO>>(`${BASE}/${id}`, activo);
    return data.data;
  },

  eliminar: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
