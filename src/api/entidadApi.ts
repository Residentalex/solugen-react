import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { EntidadDTO, TipoEntidadDTO } from '../types/entradaAlmacen';

const ENTIDADES_BASE = '/Entidad';

export const entidadApi = {
  obtenerEntidades: async (
    sucursal: number,
    conceptoCodigo?: string,
    activo?: boolean,
    tipo?: string
  ): Promise<EntidadDTO[]> => {
    const params: Record<string, string> = {};
    if (conceptoCodigo) params.concepto = conceptoCodigo;
    if (activo !== undefined) params.activo = String(activo);
    if (tipo) params.tipo = tipo;

    const { data } = await apiClient.get<ApiResponse<EntidadDTO[]>>(
      `${ENTIDADES_BASE}/${sucursal}`,
      { params }
    );
    return data.data;
  },

  obtenerActivos: async (
    sucursal: number,
    conceptoCodigo?: string,
    tipo?: string
  ): Promise<EntidadDTO[]> => {
    const params: Record<string, string> = {};
    if (conceptoCodigo) params.concepto = conceptoCodigo;
    if (tipo) params.tipo = tipo;
    const { data } = await apiClient.get<ApiResponse<EntidadDTO[]>>(
      `${ENTIDADES_BASE}/${sucursal}/Activos`,
      { params }
    );
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string, tipoEntidad: string): Promise<any> => {
    const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}/${codigo}`, { params: { tipoEntidad } });
    return data.data;
  },

  buscar: async (sucursal: number, valor: string, cantidad?: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `${ENTIDADES_BASE}/${sucursal}/buscar`,
      { params: { valor, cantidad } }
    );
    return data.data;
  },

  buscarTipos: async (sucursal: number, busqueda: string): Promise<TipoEntidadDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoEntidadDTO[]>>(
      `${ENTIDADES_BASE}/${sucursal}/tipos`,
      { params: { busqueda } }
    );
    return data.data;
  },
};

export default entidadApi;
