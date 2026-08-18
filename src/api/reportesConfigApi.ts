import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ReportePlantillaListaDTO,
  ReportePlantillaDetalleDTO,
  ReportePlantillaConfigRequest,
} from '../types/reportesConfig';

export interface ReportePlantillaCrearRequest {
  codigo: string;
  nombre: string;
  tipo: string;
}

export interface ReportePlantillaAsignarEntdocRequest {
  entdocCodigo: string;
  plantillaId: number | null;
}

const BASE = '/reportes/config';

export const reportesConfigApi = {
  /** Lista de plantillas disponibles (sin el JSON completo). */
  obtenerListado: async (): Promise<ReportePlantillaListaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ReportePlantillaListaDTO[]>>(BASE);
    return data.data || [];
  },

  /** Detalle de una plantilla por id (incluye config como objeto o null). */
  obtenerPorId: async (plantillaId: number): Promise<ReportePlantillaDetalleDTO> => {
    const { data } = await apiClient.get<ApiResponse<ReportePlantillaDetalleDTO>>(`${BASE}/${plantillaId}`);
    return data.data;
  },

  /** Detalle de una plantilla por codigo (ej: FPV_TICKET, FRI_TICKET). */
  obtenerPorCodigo: async (codigo: string): Promise<ReportePlantillaDetalleDTO> => {
    const { data } = await apiClient.get<ApiResponse<ReportePlantillaDetalleDTO>>(`${BASE}/codigo/${codigo}`);
    return data.data;
  },

  /**
   * Actualiza la config de una plantilla.
   * `config` null resetea a NULL en BD (vuelve al predeterminado).
   */
  actualizarConfig: async (
    plantillaId: number,
    config: ReportePlantillaConfigRequest['config'],
  ): Promise<ReportePlantillaDetalleDTO> => {
    const { data } = await apiClient.put<ApiResponse<ReportePlantillaDetalleDTO>>(
      `${BASE}/${plantillaId}`,
      { config } satisfies ReportePlantillaConfigRequest,
    );
    return data.data;
  },

  /** Crea una nueva plantilla (codigo, nombre, tipo). */
  crear: async (request: ReportePlantillaCrearRequest): Promise<ReportePlantillaDetalleDTO> => {
    const { data } = await apiClient.post<ApiResponse<ReportePlantillaDetalleDTO>>(BASE, request);
    return data.data;
  },

  /** Activa o desactiva una plantilla. */
  actualizarActivo: async (plantillaId: number, activo: boolean): Promise<void> => {
    await apiClient.patch(`${BASE}/${plantillaId}/activo`, activo, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  /** Obtiene la plantilla ESC/POS asociada a un tipo de documento (ENTDOC). */
  obtenerPorEntdoc: async (entdocCodigo: string): Promise<ReportePlantillaDetalleDTO | null> => {
    const { data } = await apiClient.get<ApiResponse<ReportePlantillaDetalleDTO | null>>(
      `${BASE}/por-entdoc/${entdocCodigo}`,
    );
    return data.data;
  },

  /** Asigna (o desasigna con null) una plantilla a un tipo de documento (ENTDOC). */
  asignarEntdoc: async (entdocCodigo: string, plantillaId: number | null): Promise<void> => {
    await apiClient.put(`${BASE}/asignar-entdoc`, {
      entdocCodigo,
      plantillaId,
    } satisfies ReportePlantillaAsignarEntdocRequest);
  },
};
