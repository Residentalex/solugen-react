import { apiClient } from './client';
import type { ActualizacionPrecioDTO } from '../types/actualizacionPrecio';
import type { ApiResponse } from '../types/auth';

const BASE = '/ADP';

export const actualizacionPrecioApi = {
  obtenerResumido: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<ActualizacionPrecioDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    const { data } = await apiClient.get<ApiResponse<ActualizacionPrecioDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    params: {
      cantidad?: number;
      salto?: number;
      desde?: string;
      hasta?: string;
      documento?: string;
      docReferencia?: string;
    }
  ): Promise<ActualizacionPrecioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ActualizacionPrecioDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },
};
