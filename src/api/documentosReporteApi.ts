import { apiClient } from './client';
import type { MovimientoVistaDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

export const documentosReporteApi = {
  obtenerAutorizados: async (sucursal: number, desde: string, hasta: string): Promise<MovimientoVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(
      `/ENP/${sucursal}/autorizados?desde=${desde}&hasta=${hasta}`
    );
    return data.data;
  },

  obtenerAplicados: async (sucursal: number, desde: string, hasta: string): Promise<MovimientoVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(
      `/ENP/${sucursal}/aplicados?desde=${desde}&hasta=${hasta}`
    );
    return data.data;
  },

  imprimirReporte: async (sucursal: number, tipo: 'autorizados' | 'aplicados', desde: string, hasta: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/reportes/inventario/${tipo}/${sucursal}?desde=${desde}&hasta=${hasta}`,
      { responseType: 'blob' }
    );
    return data;
  },

  imprimirReporteConDatos: async (sucursal: number, titulo: string, items: any[]): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(
      `/reportes/inventario/imprimir-por-datos/${sucursal}`,
      { titulo, items },
      { responseType: 'blob' }
    );
    return data;
  },
};
