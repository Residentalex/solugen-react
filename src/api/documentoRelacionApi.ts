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
  obtenerPorTransaccion: async (idTransaccion: number): Promise<DocumentoRelacionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DocumentoRelacionDTO[]>>(
      `/DocumentoRelacion/${idTransaccion}`
    );
    return data.data;
  },
};
