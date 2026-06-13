import { apiClient } from './client';
import type { PuntoVentaDTO, MetodoPagoDTO } from '../types/facturacion';
import type { ApiResponse } from '../types/auth';

const BASE = '/POS';

export const puntoVentaApi = {
  obtenerListado: async (sucursal: number): Promise<PuntoVentaDTO[]> => {
    const { data } = await apiClient.get<PuntoVentaDTO[]>(`${BASE}/${sucursal}`);
    return data; // devuelve array directo (similar a Producto)
  },

  obtenerMetodosPago: async (sucursal: number): Promise<MetodoPagoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MetodoPagoDTO[]>>(`${BASE}/${sucursal}/metodos-pago`);
    return data.data;
  },

  filtrarPuntosVenta: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<PuntoVentaDTO[]> => {
    const { data } = await apiClient.get<PuntoVentaDTO[]>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data;
  },

  filtrarMetodosPago: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<MetodoPagoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MetodoPagoDTO[]>>(`${BASE}/${sucursal}/metodos-pago/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerTotalPuntosVenta: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<number>(`${BASE}/total/${sucursal}`, { params });
    return data;
  },

  obtenerTotalMetodosPago: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/metodos-pago/total/${sucursal}`, { params });
    return data.data;
  },
};
