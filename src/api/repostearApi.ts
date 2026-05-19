import type { ApiResponse } from '../types/auth';
import { apiClient } from './client';

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${hh}${mm}${ss}`;
}

const RUTAS: Record<string, string> = {
  ENP: '/ENP',
  DEV: '/DEV',
  FAC: '/FAC',
};

export const repostearApi = {
  /** Verifica si el tipo de documento tiene una ruta específica (ENP, DEV, FAC) */
  tieneRutaEspecifica: (tipoDoc: string): boolean => {
    return tipoDoc in RUTAS;
  },
  /** Iniciar reposteo por rango de fechas. Devuelve jobId para suscribirse al progreso via SignalR */
  repostear: async (
    tipoDoc: string,
    sucursal: number,
    fechaDesde: string,
    fechaHasta: string,
    destino?: number
  ): Promise<string> => {
    const ruta = RUTAS[tipoDoc];
    if (!ruta) throw new Error(`Tipo de documento no soportado para reposteo: ${tipoDoc}`);

    // Convertir strings yyyyMMddHHmmss a Date para usar formatDateParam
    // Si ya vienen en formato yyyyMMddHHmmss, las usamos directamente
    const desde = fechaDesde.length === 14 ? fechaDesde : formatDateParam(new Date(fechaDesde));
    const hasta = fechaHasta.length === 14 ? fechaHasta : formatDateParam(new Date(fechaHasta));

    const params: Record<string, string> = { desde, hasta };
    if (destino !== undefined) params.destino = String(destino);

    const { data } = await apiClient.put<ApiResponse<string>>(
      `${ruta}/${sucursal}/repostear`,
      null,
      { params }
    );

    if (!data.isSuccess) {
      throw new Error(data.errorMessage || 'Error al iniciar el reposteo');
    }

    return data.data;
  },
};