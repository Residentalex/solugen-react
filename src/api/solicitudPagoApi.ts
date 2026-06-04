import { apiClient } from './client';
import type { FiltroSolicitudPago, SolicitudPagoVistaDTO, SolicitudPagoDTO } from '../types/solicitudPago';
import type { TransaccionBancariaVistaDTO } from '../types/transaccion';
import type { ApiResponse } from '../types/auth';

const BASE = '/SPA';

export const solicitudPagoApi = {
  obtenerResumido: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<SolicitudPagoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;
    const { data } = await apiClient.get<ApiResponse<SolicitudPagoVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (sucursal: number, filtro: FiltroSolicitudPago): Promise<TransaccionBancariaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad !== undefined) params.cantidad = filtro.cantidad;
    if (filtro.salto !== undefined) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.beneficiario) params.beneficiario = filtro.beneficiario;
    if (filtro.ctaBancaria) params.ctaBancaria = filtro.ctaBancaria;
    if (filtro.concepto) params.concepto = filtro.concepto;
    const { data } = await apiClient.get<ApiResponse<TransaccionBancariaVistaDTO[]>>(`${BASE}/${sucursal}/vista/filtrar`, { params });
    return data.data;
  },

  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<TransaccionBancariaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad !== undefined) params.cantidad = cantidad;
    if (salto !== undefined) params.salto = salto;
    if (estado !== undefined) params.estado = estado;
    const { data } = await apiClient.get<ApiResponse<TransaccionBancariaVistaDTO[]>>(`${BASE}/${sucursal}/vista`, { params });
    return data.data;
  },

  obtenerTotal: async (
    sucursal: number,
    desde?: string,
    hasta?: string
  ): Promise<number> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<SolicitudPagoDTO> => {
    const { data } = await apiClient.get<ApiResponse<SolicitudPagoDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<SolicitudPagoDTO> => {
    const { data } = await apiClient.put<ApiResponse<SolicitudPagoDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  anular: async (sucursal: number, spa: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, spa);
    return data.data;
  },

  postear: async (sucursal: number, spa: any, destino?: string): Promise<any> => {
    const params: Record<string, string> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, spa, { params });
    return data.data;
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
