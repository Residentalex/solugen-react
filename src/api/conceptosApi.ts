import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ConceptoDTO, EntidadDTO, AlmacenDTO, SuplidorDTO } from '../types/entradaAlmacen';

const CONCEPTOS_BASE = '/Concepto';
const ENTIDADES_BASE = '/Entidad';
const PROVEEDORES_BASE = '/Proveedor';
const ALMACENES_BASE = '/Almacen';

export const conceptosApi = {
  obtenerConceptos: async (
    sucursal: number,
    filtro?: string
  ): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (filtro) params.filtro = filtro;

    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(
      `${CONCEPTOS_BASE}/${sucursal}`,
      { params }
    );
    return data.data;
  },

  obtenerEntidades: async (
    sucursal: number,
    conceptoCodigo?: string
  ): Promise<EntidadDTO[]> => {
    const params: Record<string, string> = {};
    if (conceptoCodigo) params.concepto = conceptoCodigo;

    const { data } = await apiClient.get<ApiResponse<EntidadDTO[]>>(
      `${ENTIDADES_BASE}/${sucursal}`,
      { params }
    );
    return data.data;
  },

  obtenerSuplidores: async (
    sucursal: number,
    conceptoCodigo?: string
  ): Promise<SuplidorDTO[]> => {
    const params: Record<string, string> = {};
    if (conceptoCodigo) params.concepto = conceptoCodigo;

    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(
      `${PROVEEDORES_BASE}/${sucursal}`,
      { params }
    );
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(
      `${ALMACENES_BASE}/${sucursal}`
    );
    return data.data;
  },
};
