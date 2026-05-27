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
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]>>(
      `${BASE}/${sucursal}/filtrar`,
      { params: { ...params, destino } }
    );
    return data.data;
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
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]>>(
      `${BASE}/${sucursal}`,
      { params: { ...params, destino } }
    );
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<OrdenCompraVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO>>(`${BASE}/${sucursal}/${id}`, {
      params: { enp: true }
    });
    return data.data;
  },
};
