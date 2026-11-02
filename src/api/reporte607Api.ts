import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { Reporte607DTO } from '../types/facturacion';

const BASE = '/R607';

export const reporte607Api = {
  obtenerListado: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string
  ): Promise<Reporte607DTO[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    const { data } = await apiClient.get<ApiResponse<Reporte607DTO[]>>(`${BASE}/${sucursal}`, {
      params,
    });
    return data.data;
  },
};
