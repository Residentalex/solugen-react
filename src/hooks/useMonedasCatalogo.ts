import { useMemo } from 'react';
import { useCompanyStore } from '../stores/companyStore';
import type { MonedaDTO } from '../types/contabilidad';

/**
 * Catalogo MONEDAS global, leido del store de companyStore.
 *
 * El store lo descarga una sola vez al iniciar sesion dentro de la configuracion inicial
 * (ver `MainLayout` y `companyStore.fetchInitialConfig`), asi que este hook no vuelve a
 * pedirlo: solo espera a que llegue.
 *
 * Es el counterpart de `useMonedaDocumento` para las pantallas que solo necesitan el
 * catalogo (listados, filtros, formularios de catalogo) y no el selector de un documento.
 */
export function useMonedasCatalogo(): {
  monedas: MonedaDTO[];
  loading: boolean;
} {
  const monedas = useCompanyStore((s) => s.data.monedas);
  const loading = useCompanyStore((s) => s.monedasCargando);

  return { monedas: useMemo<MonedaDTO[]>(() => monedas ?? [], [monedas]), loading };
}