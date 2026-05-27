import { apiClient } from './client';
import type { MovimientoDTO } from '../types/movimiento';
import type { ApiResponse } from '../types/auth';

const BASE = '/Movimiento';

export interface MovimientoFiltros {
  desde?: string;
  hasta?: string;
  cantidad?: number;
  salto?: number;
  codigo?: string;
  almacen?: string;
  familia?: string;
  noCuenta?: string;
  sucursalTran?: string;
  suplidor?: string;
  tipoDoc?: string;
  existencia?: string;
  noAjustes?: boolean;
  costosB?: boolean;
  resumir?: boolean;
}

export const movimientoApi = {
  obtenerDetallado: async (
    sucursal: number,
    params: MovimientoFiltros
  ): Promise<MovimientoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MovimientoDTO[]>>(
      `${BASE}/${sucursal}/detallado`,
      { params }
    );
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    params: { desde?: string; hasta?: string; codigo?: string; almacen?: string; familia?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(
      `${BASE}/total/${sucursal}/detallado`,
      { params }
    );
    return data.data;
  },
};
