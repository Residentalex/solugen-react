import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, SuplidorDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface FacturaSuplidorDTO {
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

// ===== Interfaces específicas de Factura Suplidor =====

export interface TipoDTO {
  idExterno: number;
  codigo: string;
  nombre: string;
  requiereReferencia: boolean;
}

export interface EntradaReferenciaDTO {
  id: number;
  noDocumento: string;
  suplidor?: SuplidorDTO;
  detalles?: any[];
}

export interface DetalleFacturaSuplidorDTO {
  id: number;
  idExterno?: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  costo: number;
  subTotal: number;
  porcentajeDescuento: number;
  descuento: number;
  impuesto?: { nombre: string; porcentaje: number; codigo: string; idExterno: string };
  impuestos: number;
  total: number;
  familia?: { nombre: string; idExterno: string };
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  tipoArticulo: string;
  nota: string;
  tieneVencimiento?: boolean;
  fechaVencimiento?: string;
}

export interface FacturaSuplidorFullDTO {
  id: number;
  fechaDocumento: string;
  fechaVencimiento?: string;
  fechaEntrega?: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  nota: string;
  referencia: string;
  tasa: number;
  diasCredito: number;

  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  entidad?: SuplidorDTO | null;
  tipo: TipoDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;
  entradaAlmacen?: EntradaReferenciaDTO | null;

  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;

  detalles: DetalleFacturaSuplidorDTO[];
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
}
