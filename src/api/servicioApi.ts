import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ServicioDTO, ServicioVistaDTO } from '../types/servicio';
import type { ProductoDTO } from '../types/productos';

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
  crear: async (sucursal: number, dto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await apiClient.post<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },
  actualizar: async (sucursal: number, dto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await apiClient.put<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },
  obtenerImagen: async (
    sucursal: number,
    codigo: string,
    signal?: AbortSignal
  ): Promise<Blob | null> => {
    try {
      const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}/imagen`, {
        responseType: 'blob',
        signal,
      });
      return data as Blob;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },
  guardarImagen: async (sucursal: number, codigo: string, archivo: File): Promise<void> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    await apiClient.post(`${BASE}/${sucursal}/${codigo}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
