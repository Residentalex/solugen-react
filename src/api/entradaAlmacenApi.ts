import { apiClient } from './client';
import type { MovimientoVistaDTO, FiltroENP, EntradaAlmacenDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/ENP';

export const entradaAlmacenApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroENP
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.get<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, entrada: EntradaAlmacenDTO): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.post<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}`, entrada);
    return data.data;
  },

  actualizar: async (sucursal: number, entrada: EntradaAlmacenDTO): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.put<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}`, entrada);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<EntradaAlmacenDTO> => {
    const { data } = await apiClient.put<ApiResponse<EntradaAlmacenDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (origen: string, destino: string, documento: string): Promise<void> => {
    const params = { origen, destino, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  postear: async (sucursal: number, entrada: EntradaAlmacenDTO, destino?: string): Promise<any> => {
    const params: Record<string, string> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, entrada, { params });
    return data.data;
  },

  anular: async (sucursal: number, entrada: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, entrada);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
  },
};
