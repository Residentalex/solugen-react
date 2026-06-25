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
  ncf: string;
  total: number;
  estado: number;
  periodo: number;
  codigoSucursal: string;
}

export interface FiltroTRP {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  almacen?: string;
}

import type { DocumentoDTO } from './documento';
import type {
  ConceptoDTO, AlmacenDTO, MonedaDTO,
  AsientoContableDTO, LogDTO,
} from './entradaAlmacen';

export interface TransferenciaAlmacenDTO {
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

// ===== DTO completo para Transferencia Almacén (FTRP) =====

export interface DetalleTransferenciaAlmacenDTO {
  id: number;
  idExterno?: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  subTotal: number;
  total: number;
  tipoArticulo: string;
  nota?: string;
  familia?: { nombre: string; idExterno: string };
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
}

export interface TransferenciaAlmacenFullDTO {
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
  tipoDocumento?: number;

  concepto: ConceptoDTO | null;
  almacen: AlmacenDTO | null;           // Origen
  almacenDestino: AlmacenDTO | null;    // Destino
  moneda: MonedaDTO | null;
  documento: DocumentoDTO;
  creadoPor?: { id: number; nombre: string; nombreUsuario: string };
  validadoPor?: { id: number; nombre: string; nombreUsuario: string };

  subTotal: number;
  total: number;

  detalles: DetalleTransferenciaAlmacenDTO[];

  // Tipo
  codigoTipo?: string;
  tipo?: { nombre?: string; codigo?: string; idExterno?: string | number };

  asientos?: AsientoContableDTO[];
  logs?: LogDTO[];
  noDocumentoGenerado?: string;
}