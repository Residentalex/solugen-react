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
  /** Documento relacionado resuelto por el backend (editable en UI) */
  documento?: string;
  /** Tipo de documento resuelto por el backend al matchear en CTRANSAC (ej: FAC) */
  tipoDoc?: string;
  /** Nombre descriptivo del tipo de documento (resuelto por el backend) */
  nombreTipoDoc?: string;
  /** Nombre del beneficiario (NOMBRE de CTRANSAC) resuelto por el backend */
  entidad?: string;
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
  /** Nombre descriptivo del tipo de documento (resuelto por el backend) */
  nombreTipoDoc?: string;
  /** Nota del documento (NOTAS de CTRANSAC) */
  nota?: string;
}

/** Resumen de movimientos conciliados agrupados por tipo de documento */
export interface ResumenTipoDocumentoDTO {
  tipoDoc: string;
  nombreTipoDoc: string;
  cantidad: number;
  montoTotal: number;
}

/** Resumen general de conciliación (GET .../resumen-general) */
export interface ResumenGeneralConciliacionDTO {
  balanceInicialLibros: number;
  resumenLibros: ResumenTipoDocumentoDTO[];
  balanceConciliadoLibros: number;
  balanceBancos: number;
  resumenTransito: ResumenTipoDocumentoDTO[];
  balanceConciliadoBanco: number;
  diferencia: number;
}

/** Cuenta bancaria (CTASBANC) para selector */
export interface CuentaBancariaDTO {
  numeroCta: string;
  nombre: string;
  banco: string;
  idExterno?: string;
}

/** DTO para exportar movimientos del libro del mayor (DTRANS_CONT) */
export interface MovimientoLibroExportarDTO {
  tipoDoc: string;
  numDoc: string;
  fecha: string;
  debCred: string;
  monto: number;
  transacId: number;
  nombreTipoDoc: string;
  entidad: string;
  conciliado: string;
}

/** DTO para exportar documentos en tránsito (CTRANSAC) */
export interface TransitoExportarDTO {
  tipoDoc: string;
  numDoc: string;
  fecha: string;
  monto: number;
  debCred: string;
  entidad: string;
  nombreTipoDoc: string;
  conciliado: string;
}
