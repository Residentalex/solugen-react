import { apiClient } from './client';
import type { ApiResponse, Sucursal } from '../types/auth';
import type { ReporteAsientosInventarioDatosResponse } from '../types/contabilidad';

/**
 * Filtros del reporte de asientos de inventario.
 * Mapeo de `ReporteAsientosInventarioDTO` (backend) hacia query params.
 */
export interface AsientosInventarioFiltros {
  /** Fecha inicial en formato yyyyMMddHHmmss (query `desde`). */
  fechaInicial: string;
  /** Fecha final en formato yyyyMMddHHmmss (query `hasta`). */
  fechaFinal: string;
  /** Filtro por número de cuenta contable (query `noCuenta`). */
  noCuenta?: string;
  /** Filtro por tipo de documento (query `tipoDoc`). */
  tipoDocumento?: string;
  /** Usar monto alterno (query `alterno`). Default del backend: false. El desktop lo toma de la config de costo por sucursal. */
  alterno?: boolean;
  /** Incluir balance anterior (query `balance`). Default del backend: false. */
  balance?: boolean;
  /**
   * Sucursal (base de datos) donde se leen los asientos contables (query `sucursalContable`).
   * Si no se indica, el backend usa la misma sucursal del reporte.
   */
  sucursalContable?: Sucursal;
}

const buildParams = (filtros: AsientosInventarioFiltros): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('desde', filtros.fechaInicial);
  params.set('hasta', filtros.fechaFinal);
  if (filtros.noCuenta) params.set('noCuenta', filtros.noCuenta);
  if (filtros.tipoDocumento) params.set('tipoDoc', filtros.tipoDocumento);
  if (filtros.alterno !== undefined) params.set('alterno', String(filtros.alterno));
  if (filtros.balance !== undefined) params.set('balance', String(filtros.balance));
  if (filtros.sucursalContable !== undefined) params.set('sucursalContable', String(filtros.sucursalContable));
  return params;
};

export const asientosInventarioApi = {
  /**
   * Datos del reporte de asientos de inventario, agrupados por cuenta contable y tipo de documento.
   * Trae todos los datos del periodo (sin paginación server-side); la página pagina en cliente.
   */
  obtenerDatos: async (
    sucursal: number,
    filtros: AsientosInventarioFiltros,
  ): Promise<ReporteAsientosInventarioDatosResponse> => {
    const params = buildParams(filtros);
    const { data } = await apiClient.get<ApiResponse<ReporteAsientosInventarioDatosResponse>>(
      `/reportes/asientos-inventario/${sucursal}/datos?${params.toString()}`,
    );
    return data.data ?? { items: [] };
  },
};
