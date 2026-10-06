import type { LogDTO } from './entradaAlmacen';
import type { DocumentoRelacionadoDTO } from './notaDebito';
import type { CobroDTO } from './reciboIngreso';
import type { DetalleMovimientoDTO } from './notaCredito';
import type { ImpuestoFacturaDTO } from './impuestos';

export interface TransaccionVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  concepto: string;
  referencia: string;
  ncf: string;
  ncfModificado: string;
  total: number;
  nota: string;
  estado: string | number;
  periodo: number;
  codigoSucursal: string;
  fechaAccion?: string;
  creadoPor?: string;
  autorizado?: boolean;
  pagoGenerado?: boolean;
}

export interface TransaccionBancariaVistaDTO extends TransaccionVistaDTO {
  ctaBancaria?: string;
  codigoCuentaBancaria?: string;
}

export interface FiltroTransaccion {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  tipoEntidad?: string;
}

/** Modelo completo de transacción para postear */
export interface TransaccionDTO {
  id: number;
  reversoID?: number;
  fechaDocumento: string;
  fechaVencimiento?: string;
  noDocumento: string;
  codigoEntidad?: string;
  codigoEntidadOrigen?: string;
  codigoClaseEntidad?: string;
  codigoConcepto?: string;
  codigoMoneda?: string;
  codigoTipo?: string;
  codigoSucursal?: string;
  nombreUsuario?: string;
  nombreEntidad?: string;
  tipoEntidad?: string;
  numeroCuenta?: string;
  diasCredito?: number;
  referencia?: string;
  idExterno?: number;
  ncf?: string;
  ncfModificado?: string;
  nota?: string;
  debitos: number;
  creditos: number;
  tasa: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;
  estado: string | number;
  periodo: number;
  debitado?: number;
  acreditado?: number;
  ctaBancaria?: string;
  tipoDocumento?: string;
  nombreBeneficiario?: string;
  concepto?: TransaccionConceptoDTO;
  documento?: TransaccionDocumentoDTO;
  entidad?: TransaccionEntidadDTO;
  asientos?: TransaccionAsientoDTO[];
  logs?: LogDTO[];
  transaccionesAsociadas?: DocumentoRelacionadoDTO[];
  cobros?: CobroDTO[];
  detalles?: DetalleMovimientoDTO[];
  impuestosFactura?: ImpuestoFacturaDTO[];
  sucursal?: SucursalSimpleDTO | null;
}

export interface TransaccionConceptoDTO {
  codigo: string;
  nombre?: string;
}

export interface TransaccionDocumentoDTO {
  codigo: string;
  nombre?: string;
  origenCuenta?: number;
}

export interface TransaccionEntidadDTO {
  codigo: string;
  nombre?: string;
}

export interface TransaccionAsientoDTO {
  id?: number;
  noCuenta?: string;
  monto: number;
  tipoAsiento?: number;
  descripcion?: string;
  cuentaContable?: { noCuenta?: string; nombre?: string };
}

/** Sucursal simple con código y nombre */
export interface SucursalSimpleDTO {
  codigo?: string;
  nombre?: string;
}

/** Resultado de postear un documento individual */
export interface ResultadoPosteoDTO {
  exito: boolean;
  documento: string;
  mensaje?: string;
}

/** Tipo de documento para dropdowns */
export interface TipoDocumentoDTO {
  codigo: string;
  nombre: string;
  documento?: string;
}

/**
 * Una fila por documento asociado al que el documento que se aplica le imputa un monto.
 * El saldo parte del historial de pagos ya aplicados, no solo del monto registrado.
 */
export interface ValidacionPagoDTO {
  transaccionAsociada: number;
  tipoDocumentoAsociado?: string;
  noDocumentoAsociado?: string;
  total: number;
  montoAplicar: number;
  pagadoHistorico: number;
  /** Parte del historial aplicada por documentos del mismo tipo que el que se aplica. */
  pagadoMismoTipo: number;
  saldo: number;
  saldoResultante: number;
  esSobrepago: boolean;
}

/** Otro documento del mismo tipo, sin aplicar, que compite por el mismo documento asociado. */
export interface PagoPendienteDuplicadoDTO {
  transaccionAsociada: number;
  tipoDocumentoAsociado?: string;
  noDocumentoAsociado?: string;
  transaccionPago: number;
  tipoDocumentoPago?: string;
  noDocumentoPago?: string;
  fechaPago?: string;
  monto: number;
}

/** Historial de pagos de un documento antes de aplicarlo. */
export interface ValidacionPagosDTO {
  transaccion: number;
  documentosAsociados: ValidacionPagoDTO[];
  pagosPendientesDuplicados: PagoPendienteDuplicadoDTO[];
  montoSobrepago: number;
  tieneErrores: boolean;
  mensaje?: string | null;
}