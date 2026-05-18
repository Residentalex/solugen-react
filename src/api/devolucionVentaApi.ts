import { apiClient } from './client';
import type { FacturaVistaDTO, FiltroFacturacion } from '../types/facturacion';
import type { DevolucionVentaDTO } from '../types/devolucionVenta';
import type { ApiResponse } from '../types/auth';

const BASE = '/DEV';

export const devolucionVentaApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<FacturaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroFacturacion
  ): Promise<FacturaVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.nCF) params.nCF = filtro.nCF;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.cliente) params.cliente = filtro.cliente;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<FacturaVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<DevolucionVentaDTO> => {
    const { data } = await apiClient.get<ApiResponse<DevolucionVentaDTO>>(`${BASE}/${sucursal}/${id}`);
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

  postear: async (sucursal: number, devolucion: any, destino?: number): Promise<any> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, devolucion, { params });
    return data.data;
  },

  postearMovimiento: async (sucursal: number, movimiento: any, destino?: number): Promise<any> => {
    const params: Record<string, string | number> = {};
    if (destino) params.destino = destino;
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postearMovimiento`, movimiento, { params });
    return data.data;
  },
};
