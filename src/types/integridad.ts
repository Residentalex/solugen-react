export interface AuxiliarIntegridadDTO {
  id: number;
  tipoDocumento: string;
  noDocumento: string;
  fecha: string;
  entidad: string;
  concepto: string;
  sucursalDocumento: string;
  total: number;
  totalDetalle: number;
  diferencia: number;
  observaciones: string;
}

/** Documento que debería tener asiento contable pero no lo tiene */
export interface DocumentoSinAsientoDTO {
  id: number;
  tipoDocumento?: string;
  noDocumento?: string;
  fecha: string;
  entidad?: string;
  concepto?: string;
  sucursalDocumento?: string;
  total: number;
  estado?: string;
}
