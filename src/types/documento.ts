export interface DocumentoDTO {
  id: number;
  codigo: string;
  nombre?: string;
  tipo?: string;
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
  incluirEstadoCuenta?: boolean;
  preciosIncluyenImpuestos?: boolean;
  afectaInventario?: boolean;
  requiereAsiento?: boolean;
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
  tipoNumeracion?: number;
  metodoAplicar?: number;
}
