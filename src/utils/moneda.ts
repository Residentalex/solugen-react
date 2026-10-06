import { useCompanyStore } from '../stores/companyStore';
import { useAuthStore } from '../stores/authStore';
import type { MonedaDTO } from '../types/contabilidad';

/**
 * Moneda por defecto de la sucursal activa.
 *
 * NO se deduce del catalogo MONEDAS: el default es el parametro PARAMETROS.CODMON de
 * esa sucursal y llega en `sucursales[].parametro.moneda` del endpoint de configuracion
 * inicial. La moneda de la empresa puede no ser la primera fila del catalogo.
 */
export function getMonedaSucursalActiva(): { simbolo: string; nombre: string; codigo: string } {
  const sucursalActiva = useAuthStore.getState().sucursalActiva;
  const sucursales = useCompanyStore.getState().data.sucursales;
  const sucursal = sucursales.find((s: any) => s.sucursal === sucursalActiva);
  const moneda = sucursal?.parametro?.moneda;
  return {
    simbolo: moneda?.simbolo || 'RD$',
    nombre: moneda?.nombre || 'Peso Dominicano',
    codigo: moneda?.codigo || 'DOP',
  };
}

/** Catalogo MONEDAS de la sucursal activa, si ya fue descargado al iniciar sesion. */
export function getMonedasCatalogo(sucursal?: number | null): MonedaDTO[] {
  const suc = sucursal ?? useAuthStore.getState().sucursalActiva;
  if (suc === null || suc === undefined) return [];
  return useCompanyStore.getState().data.monedas[suc] ?? [];
}

/**
 * Busca una moneda del catalogo por codigo, nombre o simbolo.
 *
 * Sustituye los ternarios binarios del estilo `'DOP' ? 'RD$' : 'USD' ? 'US$' : '$'`, que
 * etiquetaban falsamente como peso dominicano cualquier moneda distinta de USD.
 * La comparacion ignora mayusculas y espacios porque MONEDAS no es consistente.
 */
export function getMonedaPorCodigo(codigo?: string | null): MonedaDTO | null {
  if (!codigo?.trim()) return null;
  const clave = codigo.trim().toUpperCase();
  return (
    getMonedasCatalogo().find(
      (m) =>
        m.codigo?.trim().toUpperCase() === clave ||
        m.nombre?.trim().toUpperCase() === clave ||
        m.simbolo?.trim().toUpperCase() === clave,
    ) ?? null
  );
}

export function esMonedaDolar(moneda?: string | null): boolean {
  const codigo = moneda?.trim().toUpperCase();
  return codigo === 'DOLAR' || codigo === 'USD';
}

/**
 * Codigo visible de una moneda para tags y etiquetas.
 *
 * Se usa el codigo real del catalogo para no etiquetar falsamente como `DOP` cualquier
 * moneda distinta de USD. Si el catalogo no esta cargado devuelve el codigo recibido tal cual.
 */
export function etiquetaMoneda(moneda?: string | null): string {
  const codigo = moneda?.trim();
  if (!codigo) return '-';
  return getMonedaPorCodigo(codigo)?.codigo?.trim() || codigo;
}

/**
 * Simbolo de una moneda del catalogo. Si el codigo no esta en el catalogo cae al simbolo
 * de la sucursal activa en vez de asumir la moneda nacional.
 */
export function simboloMoneda(moneda?: string | null): string {
  if (!moneda?.trim()) return getMonedaSucursalActiva().simbolo;
  if (esMonedaDolar(moneda)) return 'US$';
  return getMonedaPorCodigo(moneda)?.simbolo?.trim() || getMonedaSucursalActiva().simbolo;
}


