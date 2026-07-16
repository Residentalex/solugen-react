import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionVistaDTO } from '../types/transaccion';

const BASE = '/Transaccion';

export const asientoContableApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number,
    tipoDoc?: string
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;
    if (tipoDoc) params.tipoDoc = tipoDoc;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/conAsientos/vista`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrarConAsientos: async (
    sucursal: number,
    params: Record<string, any>,
    tipoDoc?: string
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const allParams = { ...params };
    if (tipoDoc) allParams.tipoDoc = tipoDoc;
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/conAsientos/filtrar`, { params: allParams }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },
};
