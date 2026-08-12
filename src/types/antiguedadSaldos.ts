/** DTO de transacción para el reporte de antigüedad de saldos */
export interface TransaccionBalanceDTO {
  id: number;
  tipoDocumento?: string;
  noDocumento: string;
  ncf: string;
  fechaDocumento: string;
  total: number;
  impuestos?: number;
  debitos: number;
  creditos: number;
  codigoEntidad: string;
  nombreEntidad: string;
  categoriaNombre?: string;
  entidad: { codigo: string; nombre: string; categoria?: { codigo: string; nombre: string } };
  moneda: { nombre: string; codigo: string };
  tipo?: { codigo?: string; nombre?: string };
  sucursal?: { id?: number; codigo?: string; nombre?: string };
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
  categoriaNombre?: string;
  total: number;
  impuestos?: number;
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
