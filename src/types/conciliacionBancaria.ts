/** DTO de cabecera de conciliación bancaria (CONCIL) */
export interface ConciliacionBancariaDTO {
  concilID: number;
  numeroCta: string;
  fecha: string;
  fechaAnt?: string;
  notas?: string;
  balBancos: number;
  balLibros: number;
  archivo?: string;
  aplicada: boolean;
  /** Calculado por el backend */
  diferencia: number;

  // Relaciones (cargadas en detalle)
  movimientos?: MovimientoBancarioDTO[];
  ajustes?: AjusteConciliacionDTO[];
  transacciones?: TransaccionConciliadaDTO[];
}

/** DTO para vista de listado */
export interface ConciliacionBancariaVistaDTO {
  concilID: number;
  numeroCta: string;
  fecha: string;
  balBancos: number;
  balLibros: number;
  diferencia: number;
  aplicada: boolean;
}

/** Movimiento bancario importado (DARCHCON) */
export interface MovimientoBancarioDTO {
  orden: number;
  ctaBanc: string;
  fecha: string;
  numRef: string;
  monto: number;
  debCred: string;
  concepto: string;
  cotejado: boolean;
  referencia: string;
}

/** Ajuste de conciliación (AJUSTCON) */
export interface AjusteConciliacionDTO {
  ajustConId: number;
  fecha: string;
  debCred: string;
  concepto: string;
  monto: number;
  descripcion: string;
}

/** Transacción del sistema relacionada (CTRANSAC) */
export interface TransaccionConciliadaDTO {
  transacId: number;
  tipoDoc: string;
  numDoc: string;
  entidad: string;
  fecha: string;
  monto: number;
  concil: boolean;
  debCred: string;
}

/** Cuenta bancaria (CTASBANC) para selector */
export interface CuentaBancariaDTO {
  numeroCta: string;
  nombre: string;
  banco: string;
  idExterno?: string;
}
