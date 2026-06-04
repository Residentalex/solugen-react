import { apiClient } from './client';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO } from '../types/generadorOrc';
import type { ApiResponse } from '../types/auth';

const BASE = '/GORC';

export const generadorOrcApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    search?: string
  ): Promise<GeneradorOrdenCompraDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (search) params.search = search;

    const { data } = await apiClient.get<ApiResponse<GeneradorOrdenCompraDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: string): Promise<GeneradorOrdenCompraDTO> => {
    const { data } = await apiClient.get<ApiResponse<GeneradorOrdenCompraDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, generador: GeneradorOrdenCompraDTO): Promise<GeneradorOrdenCompraDTO> => {
    const { data } = await apiClient.post<ApiResponse<GeneradorOrdenCompraDTO>>(`${BASE}/${sucursal}`, generador);
    return data.data;
  },

  actualizar: async (sucursal: number, generador: GeneradorOrdenCompraDTO): Promise<GeneradorOrdenCompraDTO> => {
    const { data } = await apiClient.put<ApiResponse<GeneradorOrdenCompraDTO>>(`${BASE}/${sucursal}`, generador);
    return data.data;
  },

  filtrar: async (sucursal: number, params: Record<string, string | number>): Promise<GeneradorOrdenCompraDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<GeneradorOrdenCompraDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerDatosAnteriores: async (sucursal: number, codigos: string[]): Promise<DetalleGeneradorDTO[]> => {
    const { data } = await apiClient.post<ApiResponse<DetalleGeneradorDTO[]>>(`${BASE}/${sucursal}/datos-anteriores`, codigos);
    return data.data;
  },
};
