import { apiClient } from './client';
import type { ConteoFisicoDTO } from '../types/conteo';
import type { ApiResponse } from '../types/auth';

const BASE = '/IF';

export const conteoApi = {
  obtenerListado: async (
    sucursal: number,
    params: { desde?: string; hasta?: string; cantidad?: number; salto?: number }
  ): Promise<ConteoFisicoDTO[]> => {
    const queryParams: Record<string, string | number> = {};
    if (params.desde) queryParams.desde = params.desde;
    if (params.hasta) queryParams.hasta = params.hasta;
    if (params.cantidad) queryParams.cantidad = params.cantidad;
    if (params.salto) queryParams.salto = params.salto;

    const { data } = await apiClient.get<ApiResponse<ConteoFisicoDTO[]>>(
      `${BASE}/${sucursal}`,
      { params: queryParams }
    );
    return data.data;
  },

  obtenerUltimos: async (
    sucursal: number,
    dias: number
  ): Promise<ConteoFisicoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConteoFisicoDTO[]>>(
      `${BASE}/${sucursal}/ultimos`,
      { params: { dias } }
    );
    return data.data;
  },
};
