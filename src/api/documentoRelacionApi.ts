import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface DocumentoRelacionDTO {
  id: number;
  idOrigen: number;
  origenTipoDoc: string;
  origenNumDoc: string;
  idDestino: number;
  destinoTipoDoc: string;
  destinoNumDoc: string;
  tipoRelacion: string;
  fechaCreacion: string;
  origenSucursal?: string;
  destinoSucursal?: string;
}

export const documentoRelacionApi = {
  obtenerPorTransaccion: async (idTransaccion: number, sucursal?: number): Promise<DocumentoRelacionDTO[]> => {
    const params = sucursal !== undefined ? { sucursal } : {};
    const { data } = await apiClient.get<ApiResponse<DocumentoRelacionDTO[]>>(
      `/DocumentoRelacion/${idTransaccion}`,
      { params }
    );
    return data.data;
  },
};
