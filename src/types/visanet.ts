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
