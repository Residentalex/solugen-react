import { apiClient } from './client';
import type { TransaccionVistaDTO, FiltroTransaccion } from '../types/transaccion';
import type { ApiResponse } from '../types/auth';

const BASE = '/Transaccion';
const TIPO_DOC = 'ND';

export const notaDebitoApi = {
  obtenerVista: async (
    sucursal: number,
    tipoEntidad: string,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<TransaccionVistaDTO[]> => {
    const params: Record<string, string | number> = { TipoEntidad: tipoEntidad };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

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

  obtenerPorId: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/${id}`);
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

  desaplicar: async (sucursal: number, documento: string): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/desaplicar?sucursal=${sucursal}&documento=${documento}`);
    return data.data;
  },

  postear: async <T>(sucursal: number, transaccion: T): Promise<T> => {
    const { data } = await apiClient.post<ApiResponse<T>>(`${BASE}/${sucursal}/postear`, transaccion);
    return data.data;
  },

  recalcularPagos: async (sucursal: number, id: number): Promise<TransaccionVistaDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransaccionVistaDTO>>(`${BASE}/${sucursal}/recalcularPagos/${id}`);
    return data.data;
  },
};
