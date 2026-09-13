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
  respuestaCod?: string;
  respuestaMsg?: string;
  codMon?: string;
  transfer?: string;
  anulado?: string;
  origen?: string;
}

/** DTO de entrada para el formatter del voucher Visanet: respuesta de venta + datos de impresion */
export interface VisanetVoucherInputDTO extends VisanetResponseDTO {
  montoPesos: number;
  simMoneda: string;
  sucursalName: string;
  subsidioLabel: string;
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
