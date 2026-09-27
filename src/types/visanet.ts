import type { CompanyInfo } from '../utils/escpos-formatter';

export interface VisanetVoucherDTO {
  noSec: string;
  tipoTC?: string;
  noAprob?: string;
  nTipoTC?: string;
  transacId?: number;
  monto?: number;
  notarjeta?: string;
  host?: string;
  nombtar?: string;
  noLote?: string;
  tokenId?: string;
  rrn?: string;
  merchantId?: string;
  terminalId?: string;
  entryMode?: string;
  respuestaCod?: string;
  respuestaMsg?: string;
  codMon?: string;
  transfer?: string;
  anulado?: string;
  origen?: string;
  tokenECR?: string;
  stan?: string;
  transactionDate?: string;
  isoNumCode?: string;
  isDcc?: boolean;
  exchangeRate?: string;
  transCurrency?: string;
  totalAmount?: string;
  totalTransAmount?: string;
}

/** DTO de entrada para el formatter del voucher Visanet: respuesta de venta + datos de impresion */
export interface VisanetVoucherInputDTO extends VisanetResponseDTO {
  montoPesos: number;
  simMoneda: string;
  sucursalName: string;
  subsidioLabel: string;
  /** Datos de la empresa inyectados en el JSON de impresion (el backend descarta el objeto `company` del payload). */
  sucursal?: CompanyInfo;
}

export interface VisanetResponseDTO {
  exitoso: boolean;
  codigoRespuesta?: string;
  mensajeRespuesta?: string;
  autorizacion?: string;
  tokenId?: string;
  tokenECR?: string;
  totalAmount?: string;
  panMasked?: string;
  stan?: string;
  issuerName?: string;
  cardHolderName?: string;
  rrn?: string;
  batchNumber?: string;
  processingHost?: string;
  terminalId?: string;
  merchantId?: string;
  transactionDate?: string;
  entryMode?: string;
  isoNumCode?: string;
  isDcc?: boolean;
  exchangeRate?: string;
  transactionCurrency?: string;
  totalTransactionAmount?: string;
}

/** Fila del cierre Visanet obtenida de VOUCHERS JOIN CTRANSAC (endpoint vouchers-cierre). */
export interface VisanetCierreDTO {
  noSec: string;
  tokenId: string;
  fecha?: string | null;
  hora?: string;
  monto?: number;
  anulado?: string;
  fanulacion?: string | null;
  hanulacion?: string;
  noLote?: string;
  host?: string;
  notarjeta?: string;
  noAprob?: string;
  rrn?: string;
}

/** Respuesta de CLOSE usada exclusivamente para la vista de prueba del cierre. */
export interface VisanetCierrePruebaTransaccionDTO {
  datetime?: string;
  approval?: string;
  acquirerName?: string;
  transactionName?: string;
  authorization?: string;
  rrn?: string;
  pan?: string;
  totalAmount?: number;
  batchNumber?: string;
  merchantId?: string;
  transactionDate?: string;
  transactionTime?: string;
  terminalId?: string;
}

export interface VisanetCierrePruebaAdquirenteDTO {
  responseCode?: number;
  responseMessage?: string;
  processingHost?: number;
  batchNumber?: number | string;
  data?: VisanetCierrePruebaTransaccionDTO[];
}

export interface VisanetCierrePruebaRespuestaDTO {
  authorization?: string;
  responseCode?: string;
  responseMessage?: string;
  acquirers?: VisanetCierrePruebaAdquirenteDTO[];
}

/**
 * Voucher Visanet asociado a un turno (GET /visanet/{sucursal}/vouchers-turno/{noTurno}).
 * NTipoTC trae la marca (VISA/MCARD/AMEX) a mostrar como HOST: en el reporte;
 * Rrn es el REF.: del reporte. Anulado con 'T'/'S' significa anulada.
 */
export interface VisanetTurnoVoucherDTO {
  noSec: string;
  tokenId: string;
  fecha?: string | null;
  hora?: string;
  monto?: number;
  anulado?: string;
  noLote?: string;
  host?: string;
  nTipoTC?: string;
  notarjeta?: string;
  noAprob?: string;
  nombtar?: string;
  tipoTC?: string;
  rrn?: string;
  merchantId?: string;
  terminalId?: string;
}
