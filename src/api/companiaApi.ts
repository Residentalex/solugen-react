import { apiClient } from './client';

const BASE = '/Compania';

export const companiaApi = {
  obtenerTodas: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get(`${BASE}/todas/${sucursal}`);
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  /** Compania activa de la sucursal (nombre desde parametros.descripcion). */
  obtenerActiva: async (sucursal: number): Promise<any> => {
    const { data } = await apiClient.get(`${BASE}/activa/${sucursal}`);
    return data?.data ?? data;
  },
};
