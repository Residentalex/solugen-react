/** DTO de transacción para el reporte de antigüedad de saldos */
export interface TransaccionBalanceDTO {
  id: number;
  noDocumento: string;
  ncf: string;
  fechaDocumento: string;
  total: number;
  debitos: number;
  creditos: number;
  codigoEntidad: string;
  nombreEntidad: string;
  entidad: { codigo: string; nombre: string };
  moneda: { nombre: string; codigo: string };
}

/** Agrupación por entidad para vista resumida (original) */
export interface BalancePorEntidad {
  codigoEntidad: string;
  nombreEntidad: string;
  totalDebitos: number;
  totalCreditos: number;
  balance: number;
  moneda: string;
}

/** Agrupación por entidad con buckets de aging para vista resumida */
export interface ResumenAgingDTO {
  key: string;
  codigoEntidad: string;
  nombreEntidad: string;
  total: number;
  monto0_30: number;
  monto31_60: number;
  monto61_90: number;
  monto91_120: number;
  montoMas120: number;
  moneda: string;
}

/** DTO de categoría de entidad */
export interface CategoriaEntidadDTO {
  id: number;
  nombre: string;
  codigo: string;
  idExterno?: string;
}
