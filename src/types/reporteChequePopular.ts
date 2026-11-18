/**
 * Datos que consumen los reportes de cheque de Banco Popular
 * (`/reportes/banco/cheque/{sucursal}/vista-previa` e `/imprimir`).
 * Corresponde a `ReporteTransaccionBancariaDTO` del backend.
 */
export interface ReporteChequePopularDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: string;
  noDocumento: string;
  codigoEntidad: string;
  nombreEntidad: string;
  ctaBancaria: string;
  concepto: string;
  referencia: string;
  total: number;
  nombreBeneficiario: string;
  montoEnLetras: string;
  estado: string | number;
  notas: string;
}
