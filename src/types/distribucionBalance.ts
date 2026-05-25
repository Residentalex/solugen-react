import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, EntidadDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface DistribucionBalanceDTO {
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
  /** Debito o Credito */
  origenCuenta?: string;
  retencion?: number;
}

export interface DistribucionBalanceFullDTO {
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

  tipo?: any;
  concepto?: ConceptoDTO | null;
  entidad?: EntidadDTO | null;
  moneda?: MonedaDTO | null;
  documento: DocumentoDTO;
  tipoEntidad: string;

  transaccionesAsociadas: TransaccionAsociadaDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
}
