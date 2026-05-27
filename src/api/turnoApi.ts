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
};

export { formatDateParam };
