import { apiClient } from './client';
import type { ProductoListaDTO, FiltroProducto } from '../types/productos';
import type { ApiResponse } from '../types/auth';

const BASE = '/Producto';

export const productoApi = {
  obtenerListado: async (
    sucursal: number,
    params?: { filas?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (sucursal: number, filtro: FiltroProducto): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ProductoListaDTO> => {
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },
};
