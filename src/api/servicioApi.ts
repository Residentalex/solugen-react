import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ServicioDTO } from '../types/servicio';

const BASE = '/Servicio';

export const servicioApi = {
  obtenerListado: async (sucursal: number): Promise<ServicioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },
  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ServicioDTO> => {
    const { data } = await apiClient.get<ApiResponse<ServicioDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },
};
