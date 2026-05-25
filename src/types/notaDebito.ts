import type { DocumentoDTO } from './documento';

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
  documento: DocumentoDTO;
  concepto?: ConceptoDTO | null;
  tipo?: TipoDTO | null;
  entidad?: EntidadDTO | null;
  moneda?: { nombre: string; simbolo: string; codigo: string } | null;
  transaccionesAsociadas?: DocumentoRelacionadoDTO[];
  devoluciones?: DevolucionAsociadaDTO[];
  impuestosRetenciones?: ImpuestoRetencionDTO[];
  asientos?: AsientoDTO[];
  logs?: LogDTO[];
}

export interface ConceptoDTO {
  codigo: string;
  nombre?: string;
  noImpuesto?: boolean;
  noAsientos?: boolean;
  activo?: boolean;
  moneda?: { nombre: string; codigo: string };
}

export interface TipoDTO {
  codigo: string;
  nombre?: string;
}

export interface EntidadDTO {
  codigo: string;
  nombre?: string;
  identificacion?: string;
  telefono?: string;
  direccion?: string;
  diasCredito?: number;
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

export interface AsientoDTO {
  id?: number;
  cuentaContable?: { noCuenta: string; nombre: string };
  descripcion?: string;
  monto: number;
  tipoAsiento?: number | string;
}

export interface LogDTO {
  id?: number;
  fecha?: string;
  usuario?: { nombre?: string; nombreUsuario?: string };
  estacion?: string;
  accion?: number;
  descripcion?: string;
}
