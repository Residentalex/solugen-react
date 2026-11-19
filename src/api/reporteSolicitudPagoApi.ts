import { apiClient } from './client';
import type { FiltroImpresionLoteSolicitudPago } from '../types/solicitudPago';

/**
 * Reportes de Solicitudes de Pago (rutas bajo `/reportes/banco/solicitud-pago`).
 * Se mantiene separado de `solicitudPagoApi.ts` porque ese servicio usa `BASE = '/SPA'`.
 */
export const reporteSolicitudPagoApi = {
  /**
   * Imprime en lote Solicitudes de Pago según un único criterio
   * (documento | fecha | concepto). Devuelve el PDF como Blob.
   */
  imprimirLote: async (
    sucursal: number,
    params: FiltroImpresionLoteSolicitudPago
  ): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/reportes/banco/solicitud-pago/${sucursal}/lote`,
      { params, responseType: 'blob' }
    );
    return data;
  },
};
