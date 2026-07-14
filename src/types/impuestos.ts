// Basado en ImpuestoFacturaDTO del backend (SolugenApi-0.2)
// ImpuestoDTO se importa de contabilidad.ts (único canon)

import type { ImpuestoDTO } from './contabilidad';

export interface ImpuestoFacturaDTO {
  transactionID?: number;
  /** Impuesto anidado (estructura real del backend) */
  impuesto?: Partial<ImpuestoDTO>;
  monto: number;
  /** "Impuesto" | "Retencion" | etc. */
  tipo?: string;
}
