import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionVistaDTO } from '../types/transaccion';

const BASE = '/Transaccion';

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
  salto?: number,
  estado?: number
): Promise<TransaccionVistaDTO[]> {
  const params: Record<string, string | number> = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  if (cantidad) params.cantidad = cantidad;
  if (salto) params.salto = salto;
  if (estado !== undefined) params.estado = estado;

  const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
    `${BASE}/${sucursal}/conAsientos/vista`, { params }
  );

  return data.data || [];
}

export async function filtrarAsientosContables(
  sucursal: number,
  cantidad?: number,
  salto?: number,
  desde?: string,
  hasta?: string,
  estado?: number,
  documento?: string,
  nCF?: string,
  concepto?: string,
  entidad?: string
): Promise<TransaccionVistaDTO[]> {
  const params: Record<string, string | number> = {};
  if (cantidad) params.cantidad = cantidad;
  if (salto) params.salto = salto;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  if (estado !== undefined) params.estado = estado;
  if (documento) params.documento = documento;
  if (nCF) params.nCF = nCF;
  if (concepto) params.concepto = concepto;
  if (entidad) params.entidad = entidad;

  const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
    `${BASE}/${sucursal}/conAsientos/filtrar`, { params }
  );

  return data.data || [];
}

export const asientoContableApi = {
  obtenerVista: obtenerAsientosContables,
  filtrarConAsientos: filtrarAsientosContables,
};
