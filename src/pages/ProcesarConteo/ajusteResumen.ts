import type { ColumnsType } from 'antd/es/table';
import type { AjusteConteoDTO } from '../../types/procesableConteo';

/**
 * Filtro de la vista de ajuste de conteo.
 *
 * Helpers puros de la vista de ajuste. Se separan de los componentes en
 * `AjusteDetalleTabla.tsx` para no mezclar exports de componentes y de
 * funciones en el mismo archivo.
 */
export type FiltroAjuste = 'todos' | 'entradas' | 'salidas' | 'conDiferencia';

/**
 * Clases CSS de la semantica de movimientos: verde suma stock, rojo lo resta.
 * Antes eran constantes hex en este archivo, lo que fijaba el color por codigo
 * e ignoraba el tema. Ahora viven en index.css.
 */
export const CLASE_AUMENTA = 'paces-text-aumenta';
export const CLASE_DISMINUYE = 'paces-text-disminuye';

export interface ResumenAjuste {
  total: number;
  entradas: AjusteConteoDTO[];
  salidas: AjusteConteoDTO[];
  conDiferencia: AjusteConteoDTO[];
  cantidadEntradas: number;
  cantidadSalidas: number;
  totalEntradas: number;
  totalSalidas: number;
}

export function calcularResumen(ajustes: AjusteConteoDTO[] | null): ResumenAjuste {
  const lista = ajustes || [];
  const entradas = lista.filter((a) => a.cantidadAjuste > 0);
  const salidas = lista.filter((a) => a.cantidadAjuste < 0);
  const conDiferencia = lista.filter((a) => a.cantidadAjuste !== 0);

  return {
    total: lista.length,
    entradas,
    salidas,
    conDiferencia,
    cantidadEntradas: entradas.reduce((s, a) => s + a.cantidadAjuste, 0),
    cantidadSalidas: salidas.reduce((s, a) => s + a.cantidadAjuste, 0),
    totalEntradas: entradas.reduce((s, a) => s + a.totalAjuste, 0),
    totalSalidas: salidas.reduce((s, a) => s + a.totalAjuste, 0),
  };
}

export function filtrarAjustes(
  ajustes: AjusteConteoDTO[] | null,
  filtro: FiltroAjuste
): AjusteConteoDTO[] {
  const lista = ajustes || [];
  switch (filtro) {
    case 'entradas':
      return lista.filter((a) => a.cantidadAjuste > 0);
    case 'salidas':
      return lista.filter((a) => a.cantidadAjuste < 0);
    case 'conDiferencia':
      return lista.filter((a) => a.cantidadAjuste !== 0);
    default:
      return lista;
  }
}

/** Opciones del selector de filtro, con los conteos ya resueltos. */
export function opcionesFiltro(resumen: ResumenAjuste): { value: FiltroAjuste; label: string }[] {
  return [
    { value: 'conDiferencia', label: `Solo con diferencia (${resumen.conDiferencia.length})` },
    { value: 'entradas', label: `Aumentan stock (${resumen.entradas.length})` },
    { value: 'salidas', label: `Disminuyen stock (${resumen.salidas.length})` },
    { value: 'todos', label: `Todos (${resumen.total})` },
  ];
}

export function encabezadosParaExcel(columnas: ColumnsType<AjusteConteoDTO>): string[] {
  return columnas.filter((col) => col.title !== 'Acciones').map((col) => String(col.title));
}

/**
 * Arma las filas para el exportador usando las claves de datos de las columnas.
 * Los render con JSX no se exportan: se usa el valor crudo de dataIndex.
 *
 * `formatearValor` permite alinear el Excel con lo que muestra la grilla cuando
 * una columna transforma el texto en su render (por ejemplo a Title Case). Sin
 * ese parametro el archivo saldria con el texto crudo mientras la pantalla lo
 * muestra capitalizado.
 */
export function filasParaExcel(
  ajustes: AjusteConteoDTO[],
  columnas: ColumnsType<AjusteConteoDTO>,
  formatearValor?: (clave: string, valor: unknown) => unknown
): string[][] {
  const exportCols = columnas.filter((col) => col.title !== 'Acciones');

  return ajustes.map((item) =>
    exportCols.map((col) => {
      const clave = (col as { dataIndex?: string }).dataIndex;
      if (!clave) return '';
      const valor = (item as unknown as Record<string, unknown>)[clave];
      if (Array.isArray(valor)) return valor.join(', ');
      const final = formatearValor ? formatearValor(clave, valor) : valor;
      return final != null ? String(final) : '';
    })
  );
}