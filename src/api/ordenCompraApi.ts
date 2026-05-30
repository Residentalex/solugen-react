import { apiClient } from './client';
import type { OrdenCompraVistaDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/ORC';

export const ordenCompraApi = {
  filtrar: async (
    sucursal: number,
    destino: number,
    params: {
      documento?: string;
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]> | OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}/filtrar`,
      { params: { ...params, destino } }
    );
    if (Array.isArray(data)) return data;
    return (data as ApiResponse<OrdenCompraVistaDTO[]>).data || [];
  },

  obtenerResumido: async (
    sucursal: number,
    destino: number,
    params: {
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
      salto?: number;
      estado?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]> | OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}`,
      { params: { ...params, destino } }
    );
    // El backend a veces devuelve el array directamente, a veces envuelto en ApiResponse
    if (Array.isArray(data)) return data;
    return (data as ApiResponse<OrdenCompraVistaDTO[]>).data || [];
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<OrdenCompraVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },
};
