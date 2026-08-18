/**
 * Helper compartido para resolver la config de plantillas de tickets en el
 * momento de imprimir (FacturaPOS y ReciboIngreso). Mantiene un caché en
 * memoria para no golpear el backend en cada impresión.
 */
import { reportesConfigApi } from '../api/reportesConfigApi';
import type { PlantillaConfig } from '../types/reportesConfig';

/** Codigos de plantilla conocidos. */
export const CODIGO_PLANTILLA_FPV_TICKET = 'FPV_TICKET';
export const CODIGO_PLANTILLA_FRI_TICKET = 'FRI_TICKET';
export const CODIGO_PLANTILLA_VSNT_VOUCHER = 'VSNT_VOUCHER';
export const CODIGO_PLANTILLA_VSNT_ANULACION = 'VSNT_ANULACION';
export const CODIGO_PLANTILLA_VSNT_CIERRE = 'VSNT_CIERRE';
export const CODIGO_PLANTILLA_NC_TICKET = 'NC_TICKET';
export const CODIGO_PLANTILLA_TURNO_CIERRE = 'TURNO_CIERRE';

const cache = new Map<string, PlantillaConfig | null>();

/**
 * Obtiene la config de una plantilla por codigo. Devuelve la config guardada
 * o null si la plantilla no tiene config (o si el backend falla / no existe).
 * Nunca lanza: quien llama decide usar el formato predeterminado.
 */
export async function obtenerConfigPlantilla(codigo: string): Promise<PlantillaConfig | null> {
  if (cache.has(codigo)) {
    return cache.get(codigo) ?? null;
  }

  try {
    const detalle = await reportesConfigApi.obtenerPorCodigo(codigo);
    const config = detalle.config ?? null;
    cache.set(codigo, config);
    return config;
  } catch {
    // Si el backend no responde (tabla inexistente, 404, error) no bloquear la impresión.
    cache.set(codigo, null);
    return null;
  }
}

/** Invalida el caché completo (se llama tras guardar/restablecer una plantilla). */
export function limpiarCachePlantilla(): void {
  cache.clear();
}

/**
 * Obtiene la config de una plantilla por ID (para plantillas creadas dinamicamente).
 * Mantiene caché en memoria separado por clave `id:<plantillaId>`.
 */
export async function obtenerConfigPorId(plantillaId: number): Promise<PlantillaConfig | null> {
  const cacheKey = `id:${plantillaId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }
  try {
    const detalle = await reportesConfigApi.obtenerPorId(plantillaId);
    const config = detalle.config ?? null;
    cache.set(cacheKey, config);
    return config;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

/**
 * Elimina una entrada especifica del caché (util tras actualizar una plantilla por ID).
 */
export function limpiarCachePlantillaPorId(plantillaId: number): void {
  cache.delete(`id:${plantillaId}`);
}
