import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface EmpleadoDTO {
  codigo: string;
  nombre: string;
}

export const empleadoApi = {
  obtenerTodos: async (sucursal: number): Promise<EmpleadoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EmpleadoDTO[]>>(`/Empleado/${sucursal}`);
    return data.data || [];
  },
};
