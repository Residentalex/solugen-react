import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export const cierreInventarioApi = {
  /** Obtiene la fecha del último cierre de inventario */
  obtenerFechaCierre: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.get<string>(`/Parametros/${sucursal}/FechaCierreINV`);
    return data;
  },

  /** Genera el cierre de inventario para la fecha indicada */
  generarCierre: async (sucursal: number, fecha: string): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`/Existencia/${sucursal}/GenerarCierre?fecha=${fecha}`);
    return data.data;
  },

  /** Obtiene los cierres históricos de inventario */
  obtenerCierres: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>(`/cierre/${sucursal}/porFecha`);
    return data;
  },

  /** Obtiene el detalle de productos de un cierre específico */
  obtenerDetalleCierre: async (sucursal: number, cierreId: number): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>(`/cierre/${sucursal}/detalle/${cierreId}`);
    return data;
  },

  /** Reapertura un periodo cerrado */
  reaperturar: async (sucursal: number, fechaNueva: string, fechaAnterior: string): Promise<void> => {
    await apiClient.put(`/cierre/${sucursal}/reaperturar`, { fechaNueva, fechaAnterior });
  },
};
