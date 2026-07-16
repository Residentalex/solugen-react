import type {
  ClienteDTO,
  EntidadDTO,
  ConceptoDTO,
  MonedaDTO,
  AlmacenDTO,
  ImpuestoDTO,
  FamiliaArticuloDTO,
  UnidadMedidaDTO,
  AsientoContableDTO,
  LogDTO,
} from './facturaPOS';

export type {
  ClienteDTO,
  EntidadDTO,
  ConceptoDTO,
  MonedaDTO,
  AlmacenDTO,
  ImpuestoDTO,
  FamiliaArticuloDTO,
  UnidadMedidaDTO,
  AsientoContableDTO,
  LogDTO,
};

import type { FacturaPOSDTO } from './facturaPOS';
export type { FacturaPOSDTO };

import type { DocumentoRelacionadoDTO } from './notaDebito';

import type { DocumentoDTO } from './documento';
export type { DocumentoDTO };

export interface DetalleDevolucionVentaDTO {
  id: number;
  idExterno?: number;
  idTransaccion: number;
  idTransaccionExterna?: number;
  idAsociado?: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  cantidadOriginal?: number; // Cantidad original de la PV (solo para referencia visual)
  costo: number;
  precio: number;
  precioNeto?: number;
  montoBase?: number;
  subTotal: number;
  porcentajeDescuento: number;
  descuento: number;
  porcentajeImpuesto: number;
  impuestos: number;
  total: number;
  devuelto?: number;
  impuesto?: ImpuestoDTO;
  familia?: FamiliaArticuloDTO;
  medida?: UnidadMedidaDTO;
  tipoArticulo: string;
  nota?: string;
  fechaVencimiento?: string;
  tieneVencimiento: boolean;
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

export interface DevolucionVentaDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  estado: number;
  periodo: number;
  revisado?: boolean;
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
  factura?: FacturaPOSDTO;
  concepto: ConceptoDTO;
  moneda: MonedaDTO;
  almacen: AlmacenDTO;
  sucursal: EntidadDTO;
  codigoSucursal?: string;
  detalles: DetalleDevolucionVentaDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  transaccionesAsociadas?: DocumentoRelacionadoDTO[];
}

// ===== DTO completo para Devolucion Venta (FDEV) usado en formulario =====
export interface DevolucionVentaFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  referencia: string;
  nota: string;
  tasa: number;
  tipoDocumento?: number;

  // Objetos anidados
  concepto: ConceptoDTO | null;
  almacen: AlmacenDTO | null;
  cliente: ClienteDTO | null;
  entidad?: EntidadDTO | null;
  sucursal?: { codigo?: string; nombre?: string; identificacion?: string };
  factura?: FacturaPOSDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;
  creadoPor?: { id: number; nombre: string; nombreUsuario: string };
  validadoPor?: { id: number; nombre: string; nombreUsuario: string };

  // Totales
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;

  // Detalles
  detalles: DetalleDevolucionVentaDTO[];

  // Adicionales
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
  noDocumentoGenerado?: string;
}
