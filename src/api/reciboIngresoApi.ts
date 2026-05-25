import { apiClient } from './client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';
const TIPO_DOC = 'RI';

export const reciboIngresoApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = {};
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
    filtro: FiltroTransaccion
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = {};
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
    const { data } = await apiClient.get<ApiResponse<any>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, transaccion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  actualizar: async (sucursal: number, transaccion: any): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  anular: async (sucursal: number, transaccion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, transaccion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (sucursal: number, documento: string): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/desaplicar?sucursal=${sucursal}&documento=${documento}`);
    return data.data;
  },

  postear: async (sucursal: number, transaccion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, transaccion);
    return data.data;
  },

  recalcularPagos: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/recalcularPagos/${id}`);
    return data.data;
  },
};
