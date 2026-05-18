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
  detalles: DetalleFacturaClienteDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  cobros?: any[];
  transaccionNCF?: any;
}
