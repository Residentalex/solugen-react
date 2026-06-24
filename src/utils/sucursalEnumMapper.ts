// Mapeo de ID de sucursal en BD → nombre de enum del backend
const SUCURSAL_ID_A_ENUM: Record<string, string> = {
  '0000000001': 'OrensePlaza',
  '0000000002': 'HiperRomana',
  '0000000003': 'OrenseVillaHermosa',
  '0000000004': 'ElOfertazo',
  '0000000010': 'Consolidado',
};

const SUCURSAL_ID_A_NOMBRE: Record<string, string> = {
  '0000000001': 'Orense Plaza',
  '0000000002': 'Hiper Romana',
  '0000000003': 'Orense Villa Hermosa',
  '0000000004': 'El Ofertazo',
  '0000000010': 'Consolidado',
};

export function obtenerNombreEnumSucursal(codigoSucursal: string | undefined | null): string {
  if (!codigoSucursal) return 'Consolidado';
  return SUCURSAL_ID_A_ENUM[codigoSucursal] || 'Consolidado';
}

export function obtenerNombreSucursal(codigoSucursal: string | undefined | null): string {
  if (!codigoSucursal) return 'Consolidado';
  return SUCURSAL_ID_A_NOMBRE[codigoSucursal] || 'Consolidado';
}

const SUCURSAL_ID_A_NUMERO: Record<string, number> = {
  '0000000001': 0, // OrensePlaza
  '0000000002': 1, // HiperRomana
  '0000000003': 2, // OrenseVillaHermosa
  '0000000004': 3, // ElOfertazo
  '0000000010': 4, // Consolidado
};

export function codigoSucursalANumero(codigo: string | undefined | null): number | null {
  if (!codigo) return null;
  return SUCURSAL_ID_A_NUMERO[codigo] ?? null;
}
