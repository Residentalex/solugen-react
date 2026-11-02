import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CategoriaArticuloDTO, CategoriaArticuloRequestDTO, ResultadoImportacionDTO } from '../types/productos';

const BASE = '/CategoriaArticulo';

export const categoriaArticuloApi = {
  obtenerListado: async (sucursal: number): Promise<CategoriaArticuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<CategoriaArticuloDTO> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  crear: async (sucursal: number, categoria: CategoriaArticuloRequestDTO): Promise<CategoriaArticuloDTO> => {
    const { data } = await apiClient.post<ApiResponse<CategoriaArticuloDTO>>(`${BASE}/${sucursal}`, categoria);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, categoria: CategoriaArticuloRequestDTO): Promise<CategoriaArticuloDTO> => {
    const { data } = await apiClient.put<ApiResponse<CategoriaArticuloDTO>>(`${BASE}/${sucursal}/${codigo}`, categoria);
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<{ datos: CategoriaArticuloDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaArticuloDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return { datos: data.data ?? [], total: data.total ?? 0 };
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  descargarPlantilla: async (sucursal: number): Promise<Blob> => {
    const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla`, {
      responseType: 'blob',
    });
    return data;
  },

  importarExcel: async (sucursal: number, file: File): Promise<ResultadoImportacionDTO> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await apiClient.post<ApiResponse<ResultadoImportacionDTO>>(
      `${BASE}/${sucursal}/importar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },
};
