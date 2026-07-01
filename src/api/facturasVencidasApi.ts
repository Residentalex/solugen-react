import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface FacturaVencidaDTO {
  transacId: number;
  noDocumento: string;
  fechaDocumento: string;
  codigoSuplidor: string;
  nombreSuplidor: string;
  diasCredito: number;
  fechaVence: string;
  diasVencidos: number;
  total: number;
  saldoPendiente: number;
  ncf: string;
  moneda: string;
}

export const facturasVencidasApi = {
  obtenerFacturasVencidas: async (
    sucursal: number,
    fechaCorte: string,
    codSuplidor?: string,
    diasMinimo?: number,
  ): Promise<FacturaVencidaDTO[]> => {
    const params = new URLSearchParams();
    params.set('fechaCorte', fechaCorte);
    if (codSuplidor) params.set('codSuplidor', codSuplidor);
    if (diasMinimo !== undefined) params.set('diasMinimo', diasMinimo.toString());

    const { data } = await apiClient.get<ApiResponse<FacturaVencidaDTO[]>>(
      `/reportes/facturas-vencidas/${sucursal}?${params.toString()}`
    );
    return data.data || [];
  },
};
