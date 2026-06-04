import { apiClient } from './client';
import type { OrdenCompraVistaDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/ORC';

export const ordenCompraApi = {
  filtrar: async (
    sucursal: number,
    destino: number,
    params: {
      documento?: string;
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]> | OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}/filtrar`,
      { params: { ...params, destino } }
    );
    if (Array.isArray(data)) return data;
    return (data as ApiResponse<OrdenCompraVistaDTO[]>).data || [];
  },

  obtenerResumido: async (
    sucursal: number,
    destino: number,
    params: {
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
      salto?: number;
      estado?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO[]> | OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}`,
      { params: { ...params, destino } }
    );
    if (Array.isArray(data)) return data;
    return (data as ApiResponse<OrdenCompraVistaDTO[]>).data || [];
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<OrdenCompraVistaDTO> => {
    const { data } = await apiClient.get<ApiResponse<OrdenCompraVistaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (origen: string, documento: string): Promise<void> => {
    const params = { origen, documento };
    await apiClient.put(`${BASE}/desaplicar`, null, { params });
  },

  anular: async (sucursal: number, ordenCompra: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, ordenCompra);
    return data.data;
  },

  postear: async (sucursal: number, ordenCompra: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, ordenCompra);
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
