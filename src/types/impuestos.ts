// Basado en ImpuestoFacturaDTO + ImpuestoDTO del backend (SolugenApi-0.2)

export interface ImpuestoDTO {
  codigo?: string;
  nombre?: string;
  porcentaje?: number;
  noCuenta?: string;
  /** 1=Impuesto, 2=Retención */
  tipo?: number;
  idExterno?: string;
  metodoCalculo?: number;
  indicadorDGII?: number;
}

export interface ImpuestoFacturaDTO {
  transactionID?: number;
  /** Impuesto anidado (estructura real del backend) */
  impuesto?: ImpuestoDTO;
  monto: number;
  /** "Impuesto" | "Retencion" | etc. */
  tipo?: string;
}
