import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AlmacenDTO } from '../types/entradaAlmacen';

const BASE = '/Almacen';

export const almacenApi = {
  obtenerListado: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },
};
