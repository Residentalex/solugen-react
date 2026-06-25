import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, EntidadDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface ReciboIngresoDTO {
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
  tipoDocumento: number;
}

// ===== Tipos específicos para formulario de Recibo Ingreso =====

export interface TipoRISelectDTO {
  idExterno: number;
  codigo: string;
  nombre: string;
}

export interface TransaccionAsociadaDTO {
  transaccionAsociadaID?: number;
  id?: number;
  documento: string;
  nCF?: string;
  fecha?: string;
  sucursal?: string;
  retencion?: number;
  montoOriginal: number;
  pagado: number;
  saldoPendiente: number;
  /** Monto a Aplicar (editable en el formulario) */
  monto: number;
}

export interface CobroDTO {
  id: number;
  medioCobro: string;
  monto: number;
  retencion?: number;
  referencia?: string;
  editable: boolean;
}

export interface ReciboIngresoFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  nota: string;
  referencia: string;
  tasa: number;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  diasCredito?: number;
  codigoTipo?: string;
  codigoEntidad?: string;

  tipo?: TipoRISelectDTO | null;
  concepto?: ConceptoDTO | null;
  entidad?: EntidadDTO | null;
  moneda?: MonedaDTO | null;
  documento: DocumentoDTO;
  tipoDocumento: number;
  tipoEntidad?: string;
  sucursal?: any;
  codigoSucursal?: string;

  transaccionesAsociadas: TransaccionAsociadaDTO[];
  cobros: CobroDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
}
