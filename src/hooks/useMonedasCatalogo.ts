import { useEffect, useMemo } from 'react';
import { useCompanyStore } from '../stores/companyStore';
import type { MonedaDTO } from '../types/contabilidad';

/**
 * Catalogo MONEDAS de una sucursal, leido del store de companyStore.
 *
 * El store lo descarga una vez por sucursal al iniciar sesion (ver `MainLayout`), asi que
 * este hook no vuelve a pedirlo: solo espera a que llegue. Si la pantalla se monta antes
 * de que termine la carga inicial dispara el fetch como red de seguridad.
 *
 * Es el counterpart de `useMonedaDocumento` para las pantallas que solo necesitan el
 * catalogo (listados, filtros, formularios de catalogo) y no el selector de un documento.
 */
export function useMonedasCatalogo(sucursal: number | null | undefined): {
  monedas: MonedaDTO[];
  loading: boolean;
} {
  // OJO: Sucursal.OrensePlaza es 0, hay que comparar por null/undefined y no por falsy
  // o el catalogo nunca se carga en esa sucursal.
  const haySucursal = sucursal !== null && sucursal !== undefined;

  const monedas = useCompanyStore((s) => (haySucursal ? s.data.monedas[sucursal as number] : undefined));
  const loading = useCompanyStore((s) => (haySucursal ? s.monedasCargando.includes(sucursal as number) : false));
  const fetchMonedas = useCompanyStore((s) => s.fetchMonedas);

  useEffect(() => {
    if (!haySucursal) return;
    if (monedas && monedas.length) return;
    void fetchMonedas(sucursal as number);
  }, [haySucursal, sucursal, monedas, fetchMonedas]);

  return { monedas: useMemo<MonedaDTO[]>(() => monedas ?? [], [monedas]), loading: !!loading };
}