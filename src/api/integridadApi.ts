import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { AuxiliarIntegridadDTO } from '../types/integridad';

const BASE = '/Integridad';

export interface CorregirSucursalItem {
  tipoDocumento: string;
  id: number;
  sucursalCorrecta: number;
}

export interface CorregirSucursalResponse {
  exitos: number;
  errores: number;
  mensajesError: string[];
}

export const integridadApi = {
  /** Obtener reporte de integridad de auxiliares */
  obtenerAuxiliares: async (
    sucursal: number,
    desde: string,
    hasta: string,
    tipoDoc?: string,
    sucursalId?: string
  ): Promise<AuxiliarIntegridadDTO[]> => {
    const params: Record<string, string> = { desde, hasta };
    if (tipoDoc) params.tipoDoc = tipoDoc;
    if (sucursalId !== undefined && sucursalId !== '') params.sucursalId = sucursalId;

    const { data } = await apiClient.get<ApiResponse<AuxiliarIntegridadDTO[]>>(
      `${BASE}/auxiliares/${sucursal}`,
      { params }
    );
    return data.data || [];
  },

  /** Corregir sucursal de documentos seleccionados */
  corregirSucursal: async (items: CorregirSucursalItem[]): Promise<CorregirSucursalResponse> => {
    const { data } = await apiClient.put<ApiResponse<CorregirSucursalResponse>>(
      `${BASE}/auxiliares/corregir-sucursal`,
      { items }
    );
    return data.data || { exitos: 0, errores: 0, mensajesError: [] };
  },
};
