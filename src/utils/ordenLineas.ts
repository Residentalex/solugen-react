/**
 * Ordena las líneas de un documento agrupándolas por familia y, dentro de cada
 * familia, por código. Se usa en las líneas de los ajustes de inventario para
 * que la lectura coincida con la agrupación código/familia.
 */
export function ordenarLineasPorFamiliaYCodigo<
  T extends { codigo?: string; familia?: { nombre?: string } | null }
>(lineas: T[]): T[] {
  const comparar = (a?: string, b?: string) =>
    (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' });

  return [...lineas].sort((a, b) => {
    const porFamilia = comparar(a.familia?.nombre, b.familia?.nombre);
    if (porFamilia !== 0) return porFamilia;
    return comparar(a.codigo, b.codigo);
  });
}
