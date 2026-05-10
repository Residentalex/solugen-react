import { apiClient } from './client';
import type { MovimientoVistaDTO, FiltroDVC } from '../types/devolucionCompra';
import type { ApiResponse } from '../types/auth';

const BASE = '/DVC';

export const devolucionCompraApi = {
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
  filtro: FiltroDVC
): Promise<MovimientoVistaDTO[]> => {
  const params: Record<string, string | number> = {};
  if (filtro.cantidad) params.cantidad = filtro.cantidad;
  if (filtro.salto) params.salto = filtro.salto;
  if (filtro.desde) params.desde = filtro.desde;
  if (filtro.hasta) params.hasta = filtro.hasta;
  if (filtro.documento) params.documento = filtro.documento;
  if (filtro.concepto) params.concepto = filtro.concepto;
  if (filtro.entidad) params.entidad = filtro.entidad;
  if (filtro.referencia) params.referencia = filtro.referencia;
  if (filtro.almacen) params.almacen = filtro.almacen;

  const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
  return data.data;
},

  obtenerPorId: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  anular: async (sucursal: number, devolucion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, devolucion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
  },
};
