import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, SuplidorDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';
import type { ImpuestoFacturaDTO } from './impuestos';

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
  tipoDocumento: number;
  tipoEntidad: string;
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
  porcentajeImpuesto?: number;
  impuestos: number;
  total: number;
  familia?: { nombre: string; idExterno: string };
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  tipoArticulo: string;
  nota: string;
  tieneVencimiento?: boolean;
  fechaVencimiento?: string;
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

export interface FacturaSuplidorFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  nota: string;
  referencia: string;
  tasa: number;
  montoBienes?: number;
  montoServicio?: number;

  concepto: ConceptoDTO | null;
  suplidor: SuplidorDTO | null;
  entidad?: SuplidorDTO | null;
  tipo: TipoDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;
  tipoDocumento: number;
  tipoEntidad: string;
  diasCredito: number;
  entradaAlmacen?: EntradaReferenciaDTO | null;

  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;

  detalles: DetalleFacturaSuplidorDTO[];
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
  sucursal?: any;
  impuestosFactura?: ImpuestoFacturaDTO[];
}
