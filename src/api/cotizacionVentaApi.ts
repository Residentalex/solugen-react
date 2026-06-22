import { apiClient } from './client';
import type { CotizacionVentaDTO, FiltroCotizacionVenta } from '../types/cotizacionVenta';
import type { ApiResponse } from '../types/auth';

const BASE = '/COTV';

export const cotizacionVentaApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<{ data: CotizacionVentaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<CotizacionVentaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroCotizacionVenta
  ): Promise<{ data: CotizacionVentaDTO[]; total: number }> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.cliente) params.cliente = filtro.cliente;

    const { data } = await apiClient.get<ApiResponse<CotizacionVentaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return { data: data.data || [], total: data.total ?? 0 };
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<CotizacionVentaDTO> => {
    const { data } = await apiClient.get<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<CotizacionVentaDTO> => {
    const { data } = await apiClient.put<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async (sucursal: number, cotizacion: CotizacionVentaDTO, destino?: number): Promise<CotizacionVentaDTO> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}/postear`, cotizacion, { params });
    return data.data;
  },

  crear: async (sucursal: number, cotizacion: CotizacionVentaDTO): Promise<CotizacionVentaDTO> => {
    const { data } = await apiClient.post<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}`, cotizacion);
    return data.data;
  },

  actualizar: async (sucursal: number, id: number, cotizacion: CotizacionVentaDTO): Promise<CotizacionVentaDTO> => {
    const { data } = await apiClient.put<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}/${id}`, cotizacion);
    return data.data;
  },

  anular: async (sucursal: number, id: number): Promise<CotizacionVentaDTO> => {
    const { data } = await apiClient.put<ApiResponse<CotizacionVentaDTO>>(`${BASE}/${sucursal}/anular/${id}`);
    return data.data;
  },

  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  revisado: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
  },

  reversar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
  },

  verificarScan: async (sucursal: number, id: number): Promise<{ existe: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ existe: boolean }>>(`${BASE}/${sucursal}/${id}/scanner/verificar`);
    return data.data;
  },

  descargarScan: async (sucursal: number, id: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
      responseType: 'blob',
    });
    return data;
  },
};
