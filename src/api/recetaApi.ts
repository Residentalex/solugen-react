import { apiClient } from './client';
import type { IngredienteDTO, ProductoRecetaDTO } from '../types/receta';
import type { ApiResponse } from '../types/auth';

const BASE = '/RCT';

export const recetaApi = {
  obtenerProductosConReceta: async (sucursal: number): Promise<ProductoRecetaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoRecetaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerIngredientes: async (sucursal: number, codigo: string): Promise<IngredienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<IngredienteDTO[]>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },
};
