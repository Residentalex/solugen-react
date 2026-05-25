import { apiClient } from './client';
import type { ProductoListaDTO, ProductoDTO, FiltroProducto, ResultadoImportacionDTO } from '../types/productos';
import type { ApiResponse } from '../types/auth';

const BASE = '/Producto';

export const productoApi = {
  /** Obtener listado paginado - backend devuelve array directo, no ApiResponse */
  obtenerListado: async (
    sucursal: number,
    params?: { filas?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ProductoListaDTO[]>(`${BASE}/${sucursal}`, { params });
    return data; // data es el array directamente
  },

  /** Obtener total de productos (con filtros opcionales) */
  obtenerTotal: async (
    sucursal: number,
    params?: { codigo?: string; activo?: boolean }
  ): Promise<number> => {
    const { data } = await apiClient.get<number>(`${BASE}/total/${sucursal}`, { params });
    return data;
  },

  filtrar: async (sucursal: number, filtro: FiltroProducto): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ProductoListaDTO[]>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ProductoListaDTO> => {
    const { data } = await apiClient.get<ProductoListaDTO>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },

  obtenerDetalle: async (sucursal: number, codigo: string): Promise<ProductoDTO> => {
    const { data } = await apiClient.get<ProductoDTO>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },

  /** Obtener códigos de productos con vencimiento */
  obtenerProductosVencimiento: async (
    sucursal: number,
    codigos: string[]
  ): Promise<string[]> => {
    const { data } = await apiClient.put<ApiResponse<{ codigo: string }[]>>(
      `${BASE}/productosVencimiento/${sucursal}`,
      codigos
    );
    return (data.data || []).map((p) => p.codigo);
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
    const { data } = await apiClient.post<{ isSuccess: boolean; data: ResultadoImportacionDTO; errorMessage: string }>(
      `${BASE}/${sucursal}/importar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },
};
