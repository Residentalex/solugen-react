import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, EntidadDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface NotaCreditoDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  referencia: string;
  ncf: string;
  nota: string;
  total: number;
  documento: DocumentoDTO;
}

// ===== Tipos específicos para formulario de Nota Crédito =====

export interface TipoNCSelectDTO {
  idExterno: number;
  codigo: string;
  nombre: string;
  envioDGII?: boolean;
}

export interface TransaccionAsociadaDTO {
  transaccionAsociadaID?: number;
  id?: number;
  documento: string;
  nCF?: string;
  fecha?: string;
  montoOriginal: number;
  pagado: number;
  saldoPendiente: number;
  /** Monto a Aplicar (editable en el formulario) */
  monto: number;
}

export interface DetalleMovimientoDTO {
  id: number;
  codigo: string;
  articulo: string;
  familia?: { nombre: string };
  tipo?: string;
  cantidad: number;
  udm?: string;
  precio: number;
  subTotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  referencia?: string;
  impuesto?: { nombre: string; porcentaje: number; codigo: string; idExterno: string };
  porcentajeImpuesto?: number;
  porcentajeDescuento?: number;
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  tipoArticulo: string;
  costo?: number;
}

export interface DevolucionDTO {
  id: number;
  documento: string;
  monto: number;
  perdida: number;
  generarPerdida: boolean;
}

export interface ImpuestoFacturaDTO {
  id: number;
  nombre: string;
  cuenta?: string;
  monto: number;
  tipo?: string;
  codigo?: string;
  porcentaje?: number;
  cuentaContable?: { noCuenta: string; nombre: string };
}

export interface NotaCreditoFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  ncfModificado?: string;
  nota: string;
  referencia: string;
  tasa: number;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;

  tipo?: TipoNCSelectDTO | null;
  codigoTipo?: string;
  concepto?: ConceptoDTO | null;
  entidad?: EntidadDTO | null;
  codigoEntidad?: string;
  moneda?: MonedaDTO | null;
  documento: DocumentoDTO;
  codigoSucursal?: string;
  tipoEntidad: string;
  sucursal?: number;

  transaccionesAsociadas: TransaccionAsociadaDTO[];
  detallesMovimiento: DetalleMovimientoDTO[];
  detalles?: DetalleMovimientoDTO[];
  devoluciones: DevolucionDTO[];
  impuestosFactura: ImpuestoFacturaDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  revisado?: boolean;
  bienes?: number;
  servicios?: number;
}
