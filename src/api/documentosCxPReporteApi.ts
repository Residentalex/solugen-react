import { apiClient } from './client';
import type { MovimientoVistaDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

export const documentosCxPReporteApi = {
  obtenerAutorizados: async (
    sucursal: number,
    moduloId: number,
    desde: string,
    hasta: string,
    tipoDocumento?: string
  ): Promise<MovimientoVistaDTO[]> => {
    const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
    if (tipoDocumento) params.set('tipoDocumento', tipoDocumento);
    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(
      `/reportes/cuentasporpagar/autorizados/${sucursal}/datos?${params}`
    );
    return data.data;
  },

  obtenerAplicados: async (
    sucursal: number,
    moduloId: number,
    desde: string,
    hasta: string,
    tipoDocumento?: string
  ): Promise<MovimientoVistaDTO[]> => {
    const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
    if (tipoDocumento) params.set('tipoDocumento', tipoDocumento);
    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(
      `/reportes/cuentasporpagar/aplicados/${sucursal}/datos?${params}`
    );
    return data.data;
  },

  imprimirReporte: async (
    sucursal: number,
    moduloId: number,
    tipo: 'autorizados' | 'aplicados',
    desde: string,
    hasta: string,
    tipoDocumento?: string
  ): Promise<Blob> => {
    const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
    if (tipoDocumento) params.set('tipoDocumento', tipoDocumento);
    const { data } = await apiClient.get<Blob>(
      `/reportes/cuentasporpagar/${tipo}/${sucursal}?${params}`,
      { responseType: 'blob' }
    );
    return data;
  },

  imprimirReporteConDatos: async (
    sucursal: number,
    titulo: string,
    items: any[],
    desde?: string,
    hasta?: string
  ): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(
      `/reportes/cuentasporpagar/imprimir-por-datos/${sucursal}`,
      { titulo, items, fechaDesde: desde, fechaHasta: hasta },
      { responseType: 'blob' }
    );
    return data;
  },
};
