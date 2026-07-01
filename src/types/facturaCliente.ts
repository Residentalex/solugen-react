import type {
  ClienteDTO,
  EntidadDTO,
  ConceptoDTO,
  MonedaDTO,
  AlmacenDTO,
  ImpuestoDTO,
  FamiliaArticuloDTO,
  UnidadMedidaDTO,
  EnvioDGIIDTO,
  SecuenciaNCFDTO,
  AsientoContableDTO,
  LogDTO,
} from './facturaPOS';
import type { DocumentoDTO } from './documento';

export interface FacturaClienteResumenDTO {
  id: number;
  fecha: string;
  documento: string;
  cliente: string;
  clienteIdentificacion: string;
  concepto: string;
  ncf: string;
  ncfModificado: string;
  turno: string;
  total: string;
  estado: string;
  periodo: string;
  referencia: string;
}

export type {
  ClienteDTO,
  EntidadDTO,
  ConceptoDTO,
  MonedaDTO,
  AlmacenDTO,
  ImpuestoDTO,
  FamiliaArticuloDTO,
  UnidadMedidaDTO,
  EnvioDGIIDTO,
  SecuenciaNCFDTO,
  AsientoContableDTO,
  LogDTO,
};

// ===== Tipo de documento para Factura Cliente =====
export interface TipoDTO {
  idExterno: number;
  codigo: string;
  nombre: string;
  requiereReferencia: boolean;
  envioDGII?: boolean;
}

export interface DetalleFacturaClienteDTO {
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
  componentes?: DetalleFacturaClienteDTO[];
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

export interface FacturaClienteDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  ncfModificado: string;
  referencia: string;
  revisado?: boolean;
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
  tipo?: TipoDTO;
  envioDGII: EnvioDGIIDTO;
  secuenciaNCF: SecuenciaNCFDTO;
  detalles: DetalleFacturaClienteDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  cobros?: any[];
  transaccionNCF?: any;
  transaccionesAsociadas?: any[];
  notasSeguimiento?: any[];
}

// ===== FullDTO para formulario (crear/editar) con campos anulables =====
export interface FacturaClienteFullDTO {
  id: number;
  fechaDocumento: string;
  fechaVencimiento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  nota: string;
  referencia: string;
  tasa: number;
  diasCredito: number;
  tipoDocumento?: number;

  concepto: ConceptoDTO | null;
  cliente: ClienteDTO | null;
  almacen: AlmacenDTO | null;
  tipo: TipoDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;

  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;

  sucursal?: any;

  detalles: DetalleFacturaClienteDTO[];
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
  cobros?: any[];
  notasSeguimiento?: any[];
  transaccionesAsociadas?: any[];
  impuestosFactura?: any[];
}
