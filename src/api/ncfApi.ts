import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { NcfCajaDTO } from '../types/ncf';

const BASE = '/Monitoreo';

export const ncfApi = {
  /** Rangos NCF de cada caja de la sucursal. */
  obtenerPorSucursal: async (sucursal: number): Promise<NcfCajaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<NcfCajaDTO[]>>(
      `${BASE}/ncf/${encodeURIComponent(String(sucursal))}`,
    );
    return data.data ?? [];
  },
};
