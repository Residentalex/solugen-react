import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/Banco';

export interface BancoDTO {
  nombre: string;
  tipoEntidad: string;
  correoElectronico: string;
  idExterno: string;
  codigo: string;
}

export const bancoApi = {
  obtenerListado: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number }
  ): Promise<BancoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<BancoDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerTotal: async (sucursal: number): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`);
    return data.data;
  },
};
