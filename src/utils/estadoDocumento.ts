export const ESTADO_DOCUMENTO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

export const ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO = [
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Aplicado' },
  { value: 3, label: 'Anulado' },
];
