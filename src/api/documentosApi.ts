import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DocumentoDTO } from '../types/documento';

const BASE = '/Documento';

export const documentosApi = {
  obtenerListado: async (sucursal: number, modulo?: number): Promise<DocumentoDTO[]> => {
    const params: Record<string, number> = {};
    if (modulo !== undefined) params.modulo = modulo;
    const { data } = await apiClient.get<ApiResponse<DocumentoDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data || [];
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ datos: DocumentoDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ datos: DocumentoDTO[]; total: number }>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data || { datos: [], total: 0 };
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data || 0;
  },

  crear: async (sucursal: number, documento: DocumentoDTO): Promise<DocumentoDTO> => {
    const { data } = await apiClient.post<ApiResponse<DocumentoDTO>>(`${BASE}/${sucursal}`, documento);
    return data.data;
  },

  actualizar: async (sucursal: number, id: number, documento: DocumentoDTO): Promise<DocumentoDTO> => {
    const { data } = await apiClient.put<ApiResponse<DocumentoDTO>>(`${BASE}/${sucursal}/${id}`, documento);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<DocumentoDTO | null> => {
    try {
      const { data } = await apiClient.get<ApiResponse<DocumentoDTO>>(`${BASE}/${sucursal}/por-id/${id}`);
      return data.data || null;
    } catch {
      return null;
    }
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<DocumentoDTO | null> => {
    try {
      const { data } = await apiClient.get<ApiResponse<DocumentoDTO>>(`${BASE}/${sucursal}/${codigo}`);
      return data.data || null;
    } catch {
      return null;
    }
  },
};
