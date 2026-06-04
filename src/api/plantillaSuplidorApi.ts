import { apiClient } from './client';
import type { PlantillaSuplidorDTO } from '../types/plantillaSuplidor';
import type { ApiResponse } from '../types/auth';

const BASE = '/PlantillaSuplidor';

export const plantillaSuplidorApi = {
  obtenerTodo: async (sucursal: number): Promise<PlantillaSuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PlantillaSuplidorDTO[]>>(`${BASE}/${sucursal}`);
    return data.data || [];
  },

  obtenerPorId: async (sucursal: number, id: string): Promise<PlantillaSuplidorDTO> => {
    const { data } = await apiClient.get<ApiResponse<PlantillaSuplidorDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, dto: PlantillaSuplidorDTO): Promise<string> => {
    const { data } = await apiClient.post<ApiResponse<string>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, dto: PlantillaSuplidorDTO): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}`, dto);
  },

  eliminar: async (sucursal: number, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
