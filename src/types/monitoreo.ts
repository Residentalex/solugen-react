// DTOs para el módulo de Monitoreo de Cajas POS
// Coincide con el backend MonitoreoCajaDTO
import type { CobroDTO } from './facturaPOS';
import type { VisanetVoucherDTO } from './visanet';

export interface ConnectionStringsDTO {
  serverConnection: string;
  clientConnection: string;
  rncConnection: string;
  rncClienteConnection: string;
}

export interface MonitoreoCajaDTO {
  ip: string;
  noCaja: string;
  nombre: string;
  version: string;
  sucursal: number;
  sucursalNombre?: string;
  conectado: boolean;
  delayTime: string;
  connectionStrings: ConnectionStringsDTO;
  ultimaActualizacion: string;
  updaterServiceStatus?: string;
}

export interface ConfigurarCajaRequest {
  noCaja: string;
  version: string;
  delayTime: string;
  connectionStrings: ConnectionStringsDTO;
  syncAll?: boolean;
  ip?: string;
  updaterServiceStatus?: string;
}

export interface SincronizarRequest {
  tipos: string[];
  syncAll: boolean;
}

export const TIPOS_SINCRONIZACION = [
  { label: 'RNC', value: 'RNC' },
  { label: 'Productos', value: 'PRO' },
  { label: 'Ofertas', value: 'OFE' },
  { label: 'Clientes', value: 'CLI' },
  { label: 'Usuarios', value: 'USU' },
] as const;

// ─── Estado en vivo de una caja (GET /Monitoreo/caja/{ip}/vivo) ────────────

/** Turno abierto de la caja leído de su base local (TURNOS). */
export interface TurnoCajaVivoDTO {
  turnoId: number;
  noTurno: number;
  usuarioId: number;
  nombreUsuario: string;
  caja: string;
  montoInicial: number;
  cerrado: boolean;
  fechaApertura: string;
  horaApertura: string;
}

/** Factura POS leída en vivo de la base local de la caja. */
export interface FacturaCajaVivoDTO {
  transacId: number;
  numDoc: string;
  ncf: string;
  fecha: string;
  /** Hora tal como se almacena en CTRANSAC.HORA (12h/24h). */
  hora: string;
  monto: number;
  descuento: number;
  impuestos: number;
  total: number;
  anulado: boolean;
  registrado: boolean;
  numEntidad: string;
  nombre: string;
  usuarioId: number;
  turnoId: number;
  codMon: string;
  tasa: number;
  /** Desglose de COBROS. Null si la factura no tiene fila de cobros. */
  cobro: CobroDTO | null;
  vouchers: VisanetVoucherDTO[];
  /** PENDIENTE, ERROR, CONFIRMADA. Null si no hay fila en PV_SYNC_COLA. */
  estadoSync: string | null;
  intentosSync: number | null;
  errorSync: string | null;
}

/** Suma de COBROS de las facturas del detalle. Reusa CobroDTO (el que consume CobrosMinimal). */
export type TotalesPorMetodoDTO = CobroDTO;

/** Totales del turno (o del día) calculados en la base local de la caja. */
export interface CajaVivoResumenDTO {
  cantidadFacturas: number;
  cantidadAnuladas: number;
  totalVendido: number;
  totalAnulado: number;
  totalDescuento: number;
  totalImpuestos: number;
  totalesPorMetodo: TotalesPorMetodoDTO;
  ultimaFactura: FacturaCajaVivoDTO | null;
  vouchersCantidad: number;
  vouchersMonto: number;
  vouchersAnulados: number;
  vouchersMontoAnulado: number;
  facturasPendientesSync: number;
  facturasConErrorSync: number;
}

export interface CajaVivoDTO {
  ip: string;
  noCaja: string;
  nombre: string;
  sucursal: number;
  sucursalNombre: string;
  conectado: boolean;
  /** Origen de los datos: "TURNO" (turno abierto) o "DIA" (sin turno abierto). */
  fuente: 'TURNO' | 'DIA';
  generadoEn: string;
  turno: TurnoCajaVivoDTO | null;
  resumen: CajaVivoResumenDTO;
  facturas: FacturaCajaVivoDTO[];
  /** Total de facturas que matchean el filtro (para la paginacion server-side). */
  total: number;
}

/** Turno cerrado en la caja que aun tiene datos sin subir al central. */
export interface TurnoPorSubirDTO {
  turnoId: number;
  noTurno: number;
  caja: string;
  cajero: string;
  fechaCierre: string | null;
  horaCierre: string;
  facturasPendientes: number;
  facturasError: number;
  estadoCierre: string | null;
  ultimoError: string | null;
}

// ─── Push SignalR (hub /hubs/monitoreo) ─────────────────────────────────

/** Evento `FacturaCaja` del hub: avisa que una caja generó facturas nuevas. */
export interface FacturaCajaEventoDTO {
  ip: string;
  ultimaFacturaId: number;
  cantidad: number;
  generadoEn: string;
}
