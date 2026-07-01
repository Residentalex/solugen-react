import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { EntidadDTO } from '../types/entradaAlmacen';

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
};

export default entidadApi;
