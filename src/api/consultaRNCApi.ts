import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ClienteRNCResultado, RNCCEDRegistroDTO } from '../types/consultaRNC';

const BASE = '/ConsultaRNC';

// El controller usa `Sucursal sucursal` como tipo simple (enum) en ambos
// endpoints, por lo que se enlaza por query string: ?sucursal=<número>.
export const consultaRNCApi = {
  consultar: async (sucursal: number, rnc: string): Promise<ClienteRNCResultado | null> => {
    const { data } = await apiClient.get<ApiResponse<ClienteRNCResultado | null>>(
      `${BASE}/${encodeURIComponent(rnc)}`,
      { params: { sucursal } }
    );
    return data.data ?? null;
  },

  guardar: async (sucursal: number, rnc: string): Promise<RNCCEDRegistroDTO | null> => {
    const { data } = await apiClient.post<ApiResponse<RNCCEDRegistroDTO | null>>(
      `${BASE}/${encodeURIComponent(rnc)}/guardar`,
      null,
      { params: { sucursal } }
    );
    return data.data ?? null;
  },
};
