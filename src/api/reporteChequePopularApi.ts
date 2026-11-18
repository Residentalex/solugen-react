import { apiClient } from './client';
import type { ReporteChequePopularDTO } from '../types/reporteChequePopular';

/**
 * Reportes de cheque de Banco Popular (rutas bajo `/reportes/banco/cheque`).
 * Se mantiene separado de `transaccionBancariaApi.ts` porque ese servicio usa `BASE = '/Transaccion'`.
 */
const BASE = '/reportes/banco/cheque';

export const reporteChequePopularApi = {
  /** Vista previa: fondo del cheque mas fecha, beneficiario, importes y numero de cheque. */
  vistaPrevia: async (sucursal: number, datos: ReporteChequePopularDTO): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(`${BASE}/${sucursal}/vista-previa`, datos, {
      responseType: 'blob',
    });
    return data;
  },

  /** Impresion sobre papel preimpreso: solo fecha, beneficiario e importes. */
  imprimir: async (sucursal: number, datos: ReporteChequePopularDTO): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(`${BASE}/${sucursal}/imprimir`, datos, {
      responseType: 'blob',
    });
    return data;
  },
};
