import { apiClient } from './client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';
const TIPO_DOC = 'DBA';

export const distribucionBalanceApi = {
  obtenerVista: async (
    sucursal: number,
    tipoEntidad: string,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { TipoEntidad: tipoEntidad };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${TIPO_DOC}`, { params }
    );
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    tipoEntidad: string,
    filtro: FiltroTransaccion
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { tipoEntidad };
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${TIPO_DOC}/filtrar`, { params }
    );
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/DBA/${sucursal}/${id}`);
    return data.data;
  },
};
