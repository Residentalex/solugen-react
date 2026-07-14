export interface TransaccionAsociadaDTO {
  transaccionAsociadaID?: number;
  id?: number;
  documento: string;
  nCF?: string;
  fecha?: string;
  montoOriginal: number;
  pagado: number;
  saldoPendiente: number;
  /** Monto a Aplicar (editable en el formulario) */
  monto: number;
  /** Debito o Credito */
  origenCuenta?: string;
  retencion?: number;
}


