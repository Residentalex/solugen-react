import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/Entidad';

export interface EntidadBusquedaDTO {
  codigo?: string;
  id?: string;
  nombre?: string;
  identificacion?: string;
  entidad?: string;
  descripcion?: string;
}

export const entidadApi = {
  buscar: async (
    sucursal: number,
    valor: string,
    cantidad: number = 10
  ): Promise<EntidadBusquedaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EntidadBusquedaDTO[]>>(
      `${BASE}/${sucursal}/buscar`,
      { params: { valor, cantidad } }
    );
    return data.data;
  },
};
