// Mapeo de ID de sucursal en BD → nombre de enum del backend
const SUCURSAL_ID_A_ENUM: Record<string, string> = {
  '0000000001': 'OrensePlaza',
  '0000000002': 'HiperRomana',
  '0000000003': 'OrenseVillaHermosa',
  '0000000004': 'ElOfertazo',
  '0000000010': 'Consolidado',
};

export function obtenerNombreEnumSucursal(codigoSucursal: string | undefined | null): string {
  if (!codigoSucursal) return 'Consolidado';
  return SUCURSAL_ID_A_ENUM[codigoSucursal] || 'Consolidado';
}
