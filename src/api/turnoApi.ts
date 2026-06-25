import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TurnoDTO } from '../types/turno';

const BASE = '/TUR';

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}000000`;
}

export const turnoApi = {
  obtenerListadoResumido: async (
    sucursal: number,
    params: { desde?: string; hasta?: string; cantidad: number; salto: number }
  ): Promise<TurnoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TurnoDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    params: { cantidad?: number; salto?: number; desde?: string; hasta?: string; turno?: string }
  ): Promise<TurnoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TurnoDTO[]>>(
      `${BASE}/${sucursal}/filtrar`,
      { params }
    );
    return data.data;
  },

  obtenerPorNoTurno: async (sucursal: number, noDoc: string): Promise<TurnoDTO> => {
    const { data } = await apiClient.get<ApiResponse<TurnoDTO>>(`${BASE}/${sucursal}/doc/${noDoc}`);
    return data.data;
  },

  postear: async (sucursal: number, noTurno: string, destino?: number): Promise<any> => {
    const params: any = { noTurno, costos: true, ingresos: true };
    if (destino !== undefined) params.destino = destino;
    const { data } = await apiClient.post(`${BASE}/${sucursal}/repostear`, null, { params });
    return data;
  },
};

export { formatDateParam };
