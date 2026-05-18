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
  devuelto?: boolean;
  impuesto?: ImpuestoDTO;
  familia?: FamiliaArticuloDTO;
  medida?: UnidadMedidaDTO;
  tipoArticulo: string;
  nota?: string;
  fechaVencimiento?: string;
  tieneVencimiento: boolean;
}

export interface DevolucionVentaDTO {
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
  factura?: FacturaPOSDTO;
  concepto: ConceptoDTO;
  moneda: MonedaDTO;
  almacen: AlmacenDTO;
  sucursal: EntidadDTO;
  codigoSucursal?: string;
  detalles: DetalleDevolucionVentaDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
}
