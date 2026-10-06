import { apiClient } from './client';
import type {
  ComponenteProductoDTO,
  IngredienteDTO,
  ProductoRecetaDTO,
  ResultadoImportacionComponenteDTO,
} from '../types/receta';
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

  guardarComponentes: async (
    sucursal: number,
    codigo: string,
    componentes: ComponenteProductoDTO[]
  ): Promise<void> => {
    await apiClient.put<ApiResponse<object>>(`${BASE}/${sucursal}/${codigo}`, componentes);
  },

  descargarPlantilla: async (sucursal: number): Promise<Blob> => {
    const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla`, { responseType: 'blob' });
    return data;
  },

  importarExcel: async (
    sucursal: number,
    file: File
  ): Promise<ResultadoImportacionComponenteDTO> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await apiClient.post<ApiResponse<ResultadoImportacionComponenteDTO>>(
      `${BASE}/${sucursal}/importar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },
};
