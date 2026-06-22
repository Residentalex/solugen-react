export interface DocumentoDTO {
  id: number;
  codigo: string;
  nombre?: string;
  longitudCodigo?: number;
  puedeReimprimir?: boolean;
  recibePagos?: boolean;
  metodoPosteo?: number;
  fechaPermitida?: number;
  documentoContable?: boolean;
  documentoReverso?: string;
  origenCuenta?: number;
  tipoImpuesto?: number;
  idExterno?: string;
}
