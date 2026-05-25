import type { TransaccionDTO } from './transaccion';

/** SolicitudPagoDTO extiende TransaccionDTO - vista resumida para listado */
export interface SolicitudPagoVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  concepto: string;
  referencia: string;
  ncf: string;
  total: number;
  estado: number;
  periodo: number;
  codigoSucursal: string;
  noDocumento: string;
  nombreEntidad: string;
  cuentaBancaria: string;
}

/** Filtros para SPA */
export interface FiltroSolicitudPago {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  entidad?: string;
  beneficiario?: string;
  ctaBancaria?: string;
  concepto?: string;
}
