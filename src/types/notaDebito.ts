import type { DocumentoDTO } from './documento';
import type { ConceptoDTO, EntidadDTO, AsientoContableDTO, LogDTO } from './entradaAlmacen';
import type { ImpuestoFacturaDTO } from './impuestos';

export interface NotaDebitoDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  referencia: string;
  ncf: string;
  ncfModificado?: string;
  nota: string;
  total: number;
  subTotal?: number;
  impuestos?: number;
  retenciones?: number;
  tasa?: number;
  documento: DocumentoDTO;
  tipoDocumento: number;
  tipoEntidad: string;
}

export interface NotaDebitoFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  referencia: string;
  ncf: string;
  ncfModificado?: string;
  nota: string;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  tasa: number;
  diasCredito?: number;
  debitos: number;
  creditos: number;
  bienes?: number;
  servicios?: number;
  documento: DocumentoDTO;
  tipoDocumento: number;
  tipoEntidad: string;
  concepto?: ConceptoDTO | null;
  tipo?: TipoDTO | null;
  entidad?: EntidadDTO | null;
  moneda?: { nombre: string; simbolo: string; codigo: string } | null;
  sucursal?: { codigo: string; nombre: string } | null;
  codigoSucursal?: string;
  transaccionesAsociadas?: DocumentoRelacionadoDTO[];
  impuestosFactura?: ImpuestoFacturaDTO[];
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
}

export interface TipoDTO {
  codigo: string;
  nombre?: string;
}

export interface DocumentoRelacionadoDTO {
  transaccionAsociadaID?: number;
  id?: number;
  documento?: string;
  nCF?: string;
  montoOriginal?: number;
  pagado?: number;
  saldoPendiente?: number;
  monto: number;
}

export interface DevolucionAsociadaDTO {
  transaccionAsociadaID?: number;
  documento?: string;
  fecha?: string;
  montoOriginal?: number;
  monto: number;         // monto asignado (subtotal)
  impuesto?: number;     // impuesto de la devolución
  esDocumentoInventario: boolean;
  perdida?: number;
  generarPerdida?: boolean;
}


