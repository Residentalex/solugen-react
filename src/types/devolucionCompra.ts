export interface MovimientoVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  diasCredito: number;
  concepto: string;
  almacenOrigen: string;
  almacenDestino: string;
  ordenCompra: string;
  referencia: string;
  total: number;
  estado: number;
  periodo: number;
  codigoSucursal: string;
}

export interface FiltroDVC {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  entidad?: string;
  referencia?: string;
  almacen?: string;
}

import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, AlmacenDTO, SuplidorDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface DevolucionCompraDTO {
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

// ===== Interfaces específicas de Devolución Compra =====

export interface TipoDTO {
  idExterno: number;
  codigo: string;
  nombre: string;
  requiereReferencia: boolean;
}

export interface EntradaReferenciaDTO {
  id: number;
  noDocumento: string;
  documento?: { codigo: string; nombre: string };
  suplidor?: SuplidorDTO;
  detalles?: any[];
}

export interface DetalleDevolucionCompraDTO {
  id: number;
  idExterno?: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  devuelto: number;
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
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

export interface DevolucionCompraFullDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  estado: number;
  periodo: number;
  referencia: string;
  ncf: string;
  nota: string;
  tasa: number;
  diasCredito?: number;
  tipoDocumentoExterno?: number;
  tipoDocumento?: number;

  concepto: ConceptoDTO | null;
  almacen: AlmacenDTO | null;
  suplidor: SuplidorDTO | null;
  entidad?: SuplidorDTO | null;
  tipo: TipoDTO | null;
  entrada: EntradaReferenciaDTO | null;
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;

  sucursal?: { codigo?: string; nombre?: string; identificacion?: string };
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;

  detalles: DetalleDevolucionCompraDTO[];
  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
}
