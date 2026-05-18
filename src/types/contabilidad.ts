export interface MonedaDTO {
  id: number;
  nombre: string;
  simbolo: string;
  codigo: string;
  tasa: number;
  idExterno?: string;
}

// --- Tipos de Cuenta ---
export interface TipoCuentaDTO {
  id: number;
  nombre: string;
  idExterno: string;
}

// --- Cuentas Contables ---
export interface GrupoCuentaContableDTO {
  idExterno: string;
  codigo: string;
  nombre: string;
  notas: string;
}

export enum OrigenCuenta {
  Debito = 0,
  Credito = 1,
  Desconocido = 2,
}

export interface CuentaContableDTO {
  nombre: string;
  noCuenta: string;
  tipoCuenta: TipoCuentaDTO;
  origen: OrigenCuenta;
  cuentaControl: CuentaContableDTO | null;
  cuentaPrima: CuentaContableDTO | null;
  grupo: GrupoCuentaContableDTO;
  utilizaCentroCosto: boolean;
  moneda: MonedaDTO;
  nota: string;
  activo: boolean;
  idExterno: string;
}

// --- Impuestos ---
export enum MetodoCalculoImpuesto {
  Porcentaje = 0,
  Fijo = 1,
}

export enum TipoImpuesto {
  I = 'I',  // Impuesto
  L = 'L',  // Liquidación
  V = 'V',  // Informativo
  R = 'R',  // Retencion
}

export enum AmbitoImpuesto {
  Venta = 0,
  Compra = 1,
  Ninguno = 2,
}

export enum BaseCalculoImpuesto {
  Indefinido = 0,
  MontoNeto = 1,
  MontoTotal = 2,
}

export interface ImpuestoDTO {
  nombre: string;
  metodoCalculo: MetodoCalculoImpuesto;
  porcentaje: number;
  noCuenta: string;
  cuentaContable: string;
  tipo: TipoImpuesto;
  ambito: AmbitoImpuesto;
  idExterno: string;
  codigo: string;
  indicadorDGII?: number;
  baseCalculo?: BaseCalculoImpuesto;
}

// --- Asientos Contables / Transacciones ---

/** Modelo ligero para listas (endpoint /tipo/{TipoDoc}) */
export interface TransaccionVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  concepto: string;
  referencia: string;
  ncf: string;
  ncfModificado?: string;
  total: number;
  estado: string;
  periodo?: string;
  codigoSucursal?: string;
}

/** DocumentoDTO del backend: configuración del tipo de documento */
export interface DocumentoConfigDTO {
  nombre: string;
  origenCuenta?: number;
  tipoImpuesto?: string;
  longitudCodigo?: number;
  puedeReimprimir?: boolean;
  recibePagos?: boolean;
  metodoPosteo?: number;
  fechaPermitida?: string;
  documentoContable?: boolean;
  documentoReverso?: string;
  codigo: string;
  idExterno?: string;
}

/** ConceptoDTO del backend */
export interface ConceptoApiDTO {
  codigo: string;
  nombre: string;
  noCuenta?: string;
  activo?: boolean;
  idExterno?: string;
}

/** EntidadDTO del backend */
export interface EntidadApiDTO {
  nombre: string;
  codigo: string;
  identificacion?: string;
  activo?: boolean;
  idExterno?: string;
}

/** Modelo completo de transacción (endpoint /{sucursal} y /{sucursal}/{id}) */
export interface TransaccionDTO {
  id: number;
  fechaDocumento: string;
  noDocumento: string;
  nombreEntidad: string;
  codigoEntidad?: string;
  referencia: string;
  ncf: string;
  ncfModificado?: string;
  nota?: string;
  total: number;
  debitos: number;
  creditos: number;
  tasa: number;
  estado: number;
  periodo: number;
  codigoSucursal?: string;
  /** Objeto Documento del backend (config del tipo de documento) */
  documento: DocumentoConfigDTO;
  /** Objeto Concepto del backend */
  concepto: ConceptoApiDTO;
  /** Objeto Entidad del backend */
  entidad: EntidadApiDTO;
}

// --- Secuencias NCF ---
export interface SecuenciaNCFListDTO {
  idExterno: string;
  codigo: string;
  codigoTipoCliente: string;
  tipoComprobante: string;
  digitos: number;
  secuenciaInicial: string;
  secuenciaFinal: string;
  cantidad: number;
  usado: number;
  minimo: number;
  fechaVencimiento?: string;
  activo: boolean;
}
