import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, AlmacenDTO, SuplidorDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface FiltroSAP {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  suplidor?: string;
  almacen?: string;
}

export interface SalidaAlmacenDTO {
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

// ===== DTO completo para Salida Almacén (SAP) =====

export interface DetalleSalidaAlmacenDTO {
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
  porcentajeImpuesto: number;
  impuesto?: { nombre: string; porcentaje: number; codigo?: string; idExterno?: string };
  impuestos: number;
  total: number;
  familia?: { nombre: string; idExterno: string };
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  tipoArticulo: string;
  fechaVencimiento?: string;
  tieneVencimiento?: boolean;
  nota?: string;
}

export interface SalidaAlmacenFullDTO {
  id: number;
  fechaDocumento: string;
  fechaRecibo?: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  referencia: string;
  ncf: string;
  nota: string;
  tasa: number;
  tipoDocumento?: number;

  // Objetos anidados
  concepto: ConceptoDTO | null;
  almacen: AlmacenDTO | null;
  suplidor: SuplidorDTO | null;
  entidad?: SuplidorDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;
  creadoPor?: { id: number; nombre: string; nombreUsuario: string };
  validadoPor?: { id: number; nombre: string; nombreUsuario: string };

  // Totales
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;

  // Detalles
  detalles: DetalleSalidaAlmacenDTO[];

  // Adicionales
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
  actualizarCostos?: boolean;
  noDocumentoGenerado?: string;
}
