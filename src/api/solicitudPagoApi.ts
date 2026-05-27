import { apiClient } from './client';
import type { FiltroSolicitudPago, SolicitudPagoVistaDTO } from '../types/solicitudPago';
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

  filtrar: async (sucursal: number, filtro: FiltroSolicitudPago): Promise<SolicitudPagoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.beneficiario) params.beneficiario = filtro.beneficiario;
    if (filtro.ctaBancaria) params.ctaBancaria = filtro.ctaBancaria;
    if (filtro.concepto) params.concepto = filtro.concepto;
    const { data } = await apiClient.get<ApiResponse<SolicitudPagoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
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
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
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
};
