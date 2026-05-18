import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionVistaDTO } from '../types/transaccion';

const BASE = '/Transaccion';

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}000000`;
}

/**
 * Obtiene transacciones que tienen asientos contables.
 * Endpoint: GET /Transaccion/{sucursal}/conAsientos/vista
 * Devuelve TransaccionVistaDTO[] directamente (sin JOIN que duplique filas).
 */
export async function obtenerAsientosContables(
  sucursal: number,
  desde?: string,
  hasta?: string,
  cantidad?: number,
  salto?: number
): Promise<TransaccionVistaDTO[]> {
  const params: Record<string, string | number> = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  if (cantidad) params.cantidad = cantidad;
  if (salto) params.salto = salto;

  const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
    `${BASE}/${sucursal}/conAsientos/vista`, { params }
  );

  return data.data || [];
}

export const asientoContableApi = {
  obtenerVista: obtenerAsientosContables,
};
