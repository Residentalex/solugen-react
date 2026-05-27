export interface TransaccionVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  concepto: string;
  referencia: string;
  ncf: string;
  ncfModificado: string;
  total: number;
  nota: string;
  estado: number;
  periodo: number;
  codigoSucursal: string;
}

export interface TransaccionBancariaVistaDTO extends TransaccionVistaDTO {
  ctaBancaria?: string;
  codigoCuentaBancaria?: string;
}

export interface FiltroTransaccion {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  tipoEntidad?: string;
}

/** Modelo completo de transacción para postear */
export interface TransaccionDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  codigoEntidad?: string;
  codigoEntidadOrigen?: string;
  codigoClaseEntidad?: string;
  codigoConcepto?: string;
  codigoMoneda?: string;
  codigoTipo?: string;
  codigoSucursal?: string;
  nombreUsuario?: string;
  nombreEntidad?: string;
  tipoEntidad?: string;
  numeroCuenta?: string;
  diasCredito?: number;
  referencia?: string;
  idExterno?: number;
  ncf?: string;
  ncfModificado?: string;
  nota?: string;
  debitos: number;
  creditos: number;
  tasa: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;
  estado: number;
  periodo: number;
  debitado?: number;
  acreditado?: number;
  ctaBancaria?: string;
  concepto?: TransaccionConceptoDTO;
  documento?: TransaccionDocumentoDTO;
  entidad?: TransaccionEntidadDTO;
  asientos?: TransaccionAsientoDTO[];
}

export interface TransaccionConceptoDTO {
  codigo: string;
  nombre?: string;
}

export interface TransaccionDocumentoDTO {
  codigo: string;
  nombre?: string;
}

export interface TransaccionEntidadDTO {
  codigo: string;
  nombre?: string;
}

export interface TransaccionAsientoDTO {
  id?: number;
  noCuenta?: string;
  monto: number;
  tipoAsiento?: number;
  descripcion?: string;
}

/** Resultado de postear un documento individual */
export interface ResultadoPosteoDTO {
  exito: boolean;
  documento: string;
  mensaje?: string;
}

/** Tipo de documento para dropdowns */
export interface TipoDocumentoDTO {
  codigo: string;
  nombre: string;
}