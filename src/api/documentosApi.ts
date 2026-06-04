import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DocumentoDTO } from '../types/documento';

const BASE = '/Documento';

export const documentosApi = {
  obtenerDocumentos: async (sucursal: number): Promise<DocumentoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DocumentoDTO[]>>(`${BASE}/${sucursal}`);
    return data.data || [];
  },
};
