export interface ConteoFisicoDTO {
  evento: EventoDTO | null;
  fecha: string;
  codigoAlmacen: string;
  almacen: string;
  codigoConcepto: string;
  codigoSuplidor: string;
  nombreSuplidor?: string;
  codigoPlantilla: string;
  sucursal: number;
  concepto: string;
  documento: string;
  costo: number;
  cantidad: number;
  nota: string;
  usuario: string;
  modo: number;
  periodo: number;
  bloqueado: boolean;
  idExterno: string;
  isFromPlantilla: boolean;
  compania: CompaniaDTO | null;
  detalles: DetalleConteoFisicoDTO[];
}

export interface DetalleConteoFisicoDTO {
  codigo: string;
  articulo: string;
  cantidad: number;
  factor: number;
  ultimoCosto: number;
  referencia: string;
  familia: FamiliaArticuloDTO | null;
  medida: UnidadMedidaDTO | null;
}

export interface EventoDTO {
  id: number;
  nombre: string;
}

export interface CompaniaDTO {
  id: number;
  nombre: string;
}

export interface FamiliaArticuloDTO {
  codigo: string;
  nombre: string;
}

export interface UnidadMedidaDTO {
  codigo: string;
  nombre: string;
}
