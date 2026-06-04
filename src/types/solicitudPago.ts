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

/** DTO completo para detalle de Solicitud de Pago */
export interface SolicitudPagoDTO {
  id: number;
  fecha: string;
  documento: { codigo: string; nombre?: string };
  entidad: string;
  concepto: { nombre: string; codigo?: string };
  referencia: string;
  ncf: string;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  estado: number;
  periodo: number;
  codigoSucursal?: string;
  noDocumento: string;
  cuentaBancaria: string;
  nota: string;
  revisado?: boolean;
  tasa: number;
  moneda?: { simbolo: string; nombre: string };
  asientos: import('./entradaAlmacen').AsientoContableDTO[];
  logs: import('./entradaAlmacen').LogDTO[];
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
