// Tipos compartidos usados por Factura POS, Factura Cliente y Devolucion Venta

export interface ClienteDTO {
  nombre: string;
  codigo: string;
  identificacion: string;
  telefono?: string;
  direccion?: string;
}

export interface SecuenciaNCFDTO {
  id: number;
  codigo: string;
  nombre: string;
  tipoComprobante: string;
  ncfDesde: string;
  ncfHasta: string;
  ncfActual: string;
  fechaVencimiento?: string;
  activo: boolean;
}

export interface ImpuestoDTO {
  id: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
  tipoImpuesto: string;
}

export interface FamiliaArticuloDTO {
  id: number;
  codigo: string;
  nombre: string;
}

export interface UnidadMedidaDTO {
  id: number;
  codigo: string;
  nombre: string;
}

export interface NotaSeguimientoDTO {
  id: number;
  fecha: string;
  usuario: string;
  nota: string;
}

export interface DetalleFacturaPOSDTO {
  id: number;
  idExterno?: number;
  idTransaccion: number;
  idTransaccionExterna?: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  cantidadAlterna?: number;
  costo: number;
  costoAlterno?: number;
  precio: number;
  precioNeto?: number;
  montoBase?: number;
  subTotal: number;
  porcentajeDescuento: number;
  descuento: number;
  porcentajeImpuesto: number;
  impuestos: number;
  total: number;
  impuesto?: ImpuestoDTO;
  familia?: FamiliaArticuloDTO;
  medida?: UnidadMedidaDTO;
  tipoArticulo: string;
  nota?: string;
  fechaVencimiento?: string;
  tieneVencimiento: boolean;
  componentes?: DetalleFacturaPOSDTO[];
}

// Reusar tipos de entradaAlmacen.ts
import type {
  EntidadDTO,
  ConceptoDTO,
  MonedaDTO,
  AlmacenDTO,
  AsientoContableDTO,
  LogDTO,
} from './entradaAlmacen';

import type { EnvioDGIIDTO } from './facturacion';
import type { DocumentoDTO } from './documento';

export type { EntidadDTO, ConceptoDTO, MonedaDTO, AlmacenDTO, AsientoContableDTO, LogDTO };
export type { EnvioDGIIDTO };

// ===== Tipos para Cobros POS =====
export interface CobroDTO {
  efectivo: number;
  cheque: number;
  transferencia: number;
  tarjetaCredito: number;
  tarjetaDebito: number;
  bono: number;
  tarjetaRegalo: number;
  notaCredito: number;
}

// ===== FullDTO para formulario Factura POS (crear/editar) =====
export interface FacturaPOSFormularioDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  nota: string;
  referencia: string;
  tasa: number;
  diasCredito: number;
  turno?: string;

  concepto: ConceptoDTO | null;
  cliente: ClienteDTO | null;
  almacen: AlmacenDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;

  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;

  detalles: DetalleFacturaPOSDTO[];
  cobros?: CobroDTO;
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
}

export interface FacturaPOSDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  ncfModificado: string;
  referencia: string;
  nota: string;
  diasCredito: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;
  tasa: number;
  turno?: string;
  documento: DocumentoDTO;
  entidad: EntidadDTO;
  cliente: ClienteDTO;
  concepto: ConceptoDTO;
  moneda: MonedaDTO;
  almacen: AlmacenDTO;
  sucursal: EntidadDTO;
  codigoSucursal?: string;
  envioDGII: EnvioDGIIDTO;
  secuenciaNCF: SecuenciaNCFDTO;
  detalles: DetalleFacturaPOSDTO[];
  notasSeguimiento: NotaSeguimientoDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  cobros?: any[];
  transaccionesAsociadas?: any[];
  impuestosFactura?: any[];
}
