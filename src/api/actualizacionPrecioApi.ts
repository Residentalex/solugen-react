import { apiClient } from './client';
import type { ActualizacionPrecioDTO, ActualizacionPrecioDetalleDTO, ActualizacionPrecioCrearDTO } from '../types/actualizacionPrecio';
import type { ApiResponse } from '../types/auth';

const BASE = '/ADP';

export const actualizacionPrecioApi = {
  obtenerResumido: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number
  ): Promise<ActualizacionPrecioDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    const { data } = await apiClient.get<ApiResponse<ActualizacionPrecioDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  subirArchivoPedidosYa: async (sucursal: number, rutaCSV: string): Promise<void> => {
    await apiClient.post(`${BASE}/${sucursal}/pedidosya`, null, {
      params: { rutaCSV },
    });
  },

  filtrar: async (
    sucursal: number,
    params: {
      cantidad?: number;
      salto?: number;
      desde?: string;
      hasta?: string;
      documento?: string;
      docReferencia?: string;
    }
  ): Promise<ActualizacionPrecioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ActualizacionPrecioDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerDetalle: async (sucursal: number, id: string): Promise<ActualizacionPrecioDetalleDTO> => {
    const { data } = await apiClient.get<ApiResponse<ActualizacionPrecioDetalleDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, dto: ActualizacionPrecioCrearDTO): Promise<string> => {
    const { data } = await apiClient.post<ApiResponse<string>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, id: string, dto: ActualizacionPrecioCrearDTO): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
  },

  obtenerTotal: async (sucursal: number, desde?: string, hasta?: string): Promise<number> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  anular: async (sucursal: number, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${id}`);
  },
};
