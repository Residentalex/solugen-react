export const ESTADO_DOCUMENTO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

export const ESTADO_DOCUMENTO_LABEL_MAP: Record<string, { label: string; color: string }> = {
  'Borrador': { label: 'Borrador', color: 'default' },
  'Aplicado': { label: 'Aplicado', color: 'success' },
  'Autorizado': { label: 'Autorizado', color: 'processing' },
  'Anulado': { label: 'Anulado', color: 'error' },
  'Pagado': { label: 'Pagado', color: 'cyan' },
  'Abierto': { label: 'Abierto', color: 'warning' },
  'Cerrado': { label: 'Cerrado', color: 'default' },
  'Validado': { label: 'Aplicado', color: 'success' },
};

export const ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO = [
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Aplicado' },
  { value: 3, label: 'Anulado' },
];

export function resolveEstado(estado: string | number): { label: string; color: string } {
  if (typeof estado === 'string') {
    return ESTADO_DOCUMENTO_LABEL_MAP[estado] || { label: estado, color: 'default' };
  }
  return ESTADO_DOCUMENTO_MAP[estado] || { label: 'Desconocido', color: 'default' };
}
