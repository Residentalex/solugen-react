import { apiClient } from './client';
import type { ProductoListaDTO, ProductoDTO, FiltroProducto } from '../types/productos';

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
};
