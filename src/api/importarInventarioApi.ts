import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../types/entradaAlmacen';

export const importarInventarioApi = {
  /** Obtener conceptos según tipo de documento */
  obtenerConceptos: async (
    sucursal: number,
    tipoDocumento?: string
  ): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (tipoDocumento) params.documento = tipoDocumento;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}`, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}`);
    return data.data;
  },
};
