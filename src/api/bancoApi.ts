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
    params?: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<BancoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<BancoDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },
};
