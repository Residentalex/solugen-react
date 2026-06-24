import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface ExistenciaNegativa {
  codPro: string;
  articulo: string;
  cantidad: number;
  codAlmacen: string;
}

export const cierreInventarioApi = {
  /** Obtiene la fecha del último cierre de inventario */
  obtenerFechaCierre: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.get<string>(`/Parametros/${sucursal}/FechaCierreINV`);
    return data;
  },

  /** Genera el cierre de inventario completo (todo se procesa en backend) */
  generarCierre: async (sucursal: number, fecha: string): Promise<boolean> => {
    const { data } = await apiClient.post<ApiResponse<boolean>>(`/Existencia/${sucursal}/generar-cierre?fecha=${fecha}`);
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

  /** Obtiene productos con existencia negativa que bloquean el cierre */
  obtenerExistenciasNegativas: async (sucursal: number): Promise<ExistenciaNegativa[]> => {
    const { data } = await apiClient.get<ExistenciaNegativa[]>(`/Existencia/${sucursal}/existencias-negativas`);
    return data;
  },

  /** Reapertura un periodo cerrado */
  reaperturar: async (sucursal: number, fechaNueva: string, fechaAnterior: string, razon: string, codigoUsuario: string): Promise<void> => {
    await apiClient.put(`/cierre/${sucursal}/reaperturar`, { fechaNueva, fechaAnterior, razon, codigoUsuario });
  },
};
