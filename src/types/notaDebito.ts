import type { DocumentoDTO } from './documento';
import type { ConceptoDTO, EntidadDTO, AsientoContableDTO, LogDTO } from './entradaAlmacen';

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
  debitos: number;
  creditos: number;
  bienes?: number;
  servicios?: number;
  documento: DocumentoDTO;
  concepto?: ConceptoDTO | null;
  tipo?: TipoDTO | null;
  entidad?: EntidadDTO | null;
  moneda?: { nombre: string; simbolo: string; codigo: string } | null;
  sucursal?: { codigo: string; nombre: string } | null;
  codigoSucursal?: string;
  transaccionesAsociadas?: DocumentoRelacionadoDTO[];
  devoluciones?: DevolucionAsociadaDTO[];
  impuestosRetenciones?: ImpuestoRetencionDTO[];
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
  id?: number;
  documento?: string;
  fecha?: string;
  monto?: number;
  montoAsignado: number;
}

export interface ImpuestoRetencionDTO {
  id?: number;
  codigo?: string;
  nombre?: string;
  porcentaje?: number;
  tipo?: string; // 'Impuesto' | 'Retencion' | 'Informativo' | 'Otro'
  monto: number;
  baseImponible?: number;
}
