import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/CierreMes';

export interface CierreMesDTO {
  sucursalId: number;
  nombre: string;
  fechaUltimoCierre: string | null;
}

export const cierreMesApi = {
  /** Obtiene listado de sucursales activas con su fecha de último cierre */
  obtenerListado: async (): Promise<CierreMesDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CierreMesDTO[]>>(BASE);
    return data.data ?? [];
  },

  /** Actualiza la fecha de cierre de una sucursal */
  actualizarFecha: async (sucursal: number, fecha: string): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}`, null, {
      params: { fecha },
    });
  },
};
