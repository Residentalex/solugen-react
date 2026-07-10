import { apiClient } from './client';
import type { TransaccionDTO, TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
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
    salto?: number,
    estado?: number,
    documentCode = TIPO_DOC
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
    const params: Record<string, string | number> = { TipoEntidad: tipoEntidad };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/tipo/${documentCode}`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (
    sucursal: number,
    tipoEntidad: string,
    filtro: FiltroTransaccion,
    documentCode = TIPO_DOC
  ): Promise<{ data: TransaccionVistaDTO[]; total: number }> => {
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
      `${BASE}/${sucursal}/tipo/${documentCode}/filtrar`, { params }
    );
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  actualizar: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.put<ApiResponse<T>>(`${BASE}/${sucursal}`, transaccion);
    return data.data;
  },

  anular: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}/anular`, transaccion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (origen: number, documento: string, destino?: number): Promise<TransaccionVistaDTO> => {
    const params: Record<string, string | number> = { origen, documento };
    if (destino !== undefined) params.destino = destino;
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/desaplicar`, null, { params });
    return data.data;
  },

  postear: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}/postear`, transaccion);
    return data.data;
  },

  recalcular: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/recalcularPagos/${id}`);
    return data.data;
  },

  generarAsientos: async (sucursal: number, transaccion: any): Promise<any[]> => {
    const { data } = await apiClient.post<ApiResponse<any[]>>(
      `${BASE}/${sucursal}/generarAsiento`, transaccion
    );
    return data.data;
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/revisado/${id}`);
    return data.data;
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/reversar/${id}`);
    return data.data;
  },
};
