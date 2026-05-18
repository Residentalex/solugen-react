import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { SecuenciaNCFListDTO } from '../types/contabilidad';

const BASE = '/NCF';

export const ncfApi = {
  obtenerListado: async (sucursal: number): Promise<SecuenciaNCFListDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SecuenciaNCFListDTO[]>>(`${BASE}/${sucursal}`);
    return data.data ?? [];
  },
};
