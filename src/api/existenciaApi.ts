import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ReporteExistenciaDTO } from '../types/entradaAlmacen';

const BASE = '/Existencia';

export interface ReporteExistenciaParams {
  cantidad?: number;
  salto?: number;
  busqueda?: string;
  familia?: string;
  almacen?: string;
  soloNegativas?: boolean;
}

export const existenciaApi = {
  obtenerReporte: async (
    sucursal: number,
    params: ReporteExistenciaParams
  ): Promise<{ items: ReporteExistenciaDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<ReporteExistenciaDTO[]>>(
      `${BASE}/reporte/${sucursal}`,
      { params }
    );
    return { items: data.data ?? [], total: data.total ?? 0 };
  },
};