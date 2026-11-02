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
  prefijo?: string;
}

export interface FamiliaArticuloDTO {
  codigo: string;
  nombre: string;
}

export interface UnidadMedidaDTO {
  codigo: string;
  nombre: string;
  factor?: number;
}

export interface ImportarConteoLineaDTO {
  codigo: string;
  cantidad: number;
  /** Costo UNITARIO del artículo según el archivo de conteo. */
  costo: number;
}

export interface ImportarConteoDTO {
  /**
   * Evento de inventario. Opcional: un conteo importado desde Excel puede
   * capturarse sin evento, en cuyo caso la fecha de corte debe venir en
   * `fecha`.
   */
  codEvento?: string;
  /** Fecha del conteo en formato yyyyMMddHHmmss. */
  fecha: string;
  almacen: string;
  documento?: string;
  nota?: string;
  usuario?: string;
  lineas: ImportarConteoLineaDTO[];
}

export interface ConteoImportadoDTO {
  inventId: number;
  documento: string;
}
