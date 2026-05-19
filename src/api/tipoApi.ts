import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TipoDocumentoDTO } from '../types/transaccion';

const BASE = '/Tipo';

export const tipoApi = {
  /** Obtener tipos de documento por código de documento */
  obtenerPorDocumento: async (
    sucursal: number,
    documento: string
  ): Promise<TipoDocumentoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDocumentoDTO[]>>(
      `${BASE}/${sucursal}/Documento/${documento}`
    );
    return data.data || [];
  },

  /** Obtener todos los tipos de documento */
  obtenerTodo: async (sucursal: number): Promise<TipoDocumentoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDocumentoDTO[]>>(
      `${BASE}/${sucursal}`
    );
    return data.data || [];
  },
};