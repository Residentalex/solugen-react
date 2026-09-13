import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ReportePlantillaListaDTO,
  ReportePlantillaDetalleDTO,
  ReportePlantillaConfigRequest,
  PlantillaImprimirRequest,
  ImprimirResultadoDTO,
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

// URL del servicio de impresión local.
// En desarrollo usa http://localhost:5010/imprimir
// En produccion viene de VITE_IMPRESSION_SERVICE_URL (ej: https://genesis.ade.com/imprimir o el dominio del servicio)
const IMPRESSION_SERVICE_DEFAULT = import.meta.env.VITE_IMPRESSION_SERVICE_URL || 'http://localhost:5010/imprimir';

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

  /**
   * Obtiene el payload serializado de impresion que el frontend enviara
   * directamente al servicio local Solugen.Impresion.Service de la maquina cliente.
   * Este payload ya no pasa por localhost:5010 en el backend.
   */
  obtenerPayloadImpresion: async (plantillaId: number, request: PlantillaImprimirRequest): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      `${BASE}/${plantillaId}/imprimir`,
      request,
    );
    return data.data;
  },

  /** Envia al agente local la plantilla sincronizada y los datos de impresion. */
  imprimirLocal: async (
    payload: any,
    urlOverride?: string,
  ): Promise<{ ok: boolean; impresora?: string; error?: string }> => {
    const urlServicioLocal = urlOverride || IMPRESSION_SERVICE_DEFAULT;
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;

    try {
      const response = await apiClient.post(
        urlServicioLocal,
        body,
        {
          params: { _t: Date.now() },
        }
      );
      if (response.status !== 202) {
        return { ok: false, error: 'El agente local no confirmo la aceptacion del trabajo.' };
      }

      return { ok: true, impresora: response.data?.impresora };
    } catch (err: any) {
      const detalle =
        err?.response?.data?.error ??
        err?.message ??
        'No se pudo comunicar con el agente local.';
      console.error('[imprimirLocal] Error:', detalle);
      return { ok: false, error: detalle };
    }
  },

  /** Obtiene una imagen del mismo ticket que se enviaria al agente local. */
  previsualizarLocal: async (
    payload: any,
    urlOverride?: string,
  ): Promise<{ ok: boolean; imagen?: Blob; error?: string }> => {
    const urlServicioLocal = urlOverride || IMPRESSION_SERVICE_DEFAULT;
    const urlBase = urlServicioLocal.replace(/\/+$/, '');
    const urlPrevisualizacion = urlBase.endsWith('/imprimir')
      ? `${urlBase.slice(0, -'/imprimir'.length)}/previsualizar`
      : `${urlBase}/previsualizar`;
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;

    try {
      const response = await apiClient.post(urlPrevisualizacion, body, {
        params: { _t: Date.now() },
        responseType: 'blob',
      });
      if (response.status !== 200) {
        return { ok: false, error: 'El agente local no pudo generar la vista previa.' };
      }

      return { ok: true, imagen: response.data };
    } catch (err: any) {
      let detalle = err?.message ?? 'No se pudo comunicar con el agente local.';
      const respuesta = err?.response?.data;
      if (respuesta instanceof Blob) {
        try {
          const cuerpoError = JSON.parse(await respuesta.text());
          detalle = cuerpoError?.error ?? detalle;
        } catch {
          // Conserva el error original cuando la respuesta no contiene JSON.
        }
      } else {
        detalle = respuesta?.error ?? detalle;
      }
      console.error('[previsualizarLocal] Error:', detalle);
      return { ok: false, error: detalle };
    }
  },
};
