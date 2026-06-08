// Basado en EntidadDTO.cs + ClienteDTO.cs del backend
export interface ClienteDTO {
  // De EntidadDTO
  codigo: string;
  nombre: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  tipoIdentificacion: string; // enum string
  identificacion: string;
  codigoTipoEntidad?: string;
  correoElectronico: string;
  telefono: string;
  telefonoAdicional: string;
  sexo?: number;       // 0=Masculino, 1=Femenino (del enum Sexo del backend)
  fechaNacimiento?: string; // DateTime? del backend
  estadoCivil?: number; // 0=Soltero, 1=Casado, etc. (del enum EstadoCivil del backend)
  direccion: string;
  nota: string;
  activo: boolean;
  idExterno?: string;

  // De ClienteDTO extra
  limiteCredito: number;
  diasCredito: number;
  creditoSuspendido: boolean;
  exentoImpuesto: boolean;
  margen: number;
  porcientoDescuento: number;
}

// Basado en PuntoVentaDTO.cs
export interface PuntoVentaDTO {
  nombre: string;
  ip: string;
  ruta: string;
  idExterno?: string;
}

// Basado en MetodoPagoDTO.cs
export interface MetodoPagoDTO {
  id: number;
  nombre: string;
  codigo: string;
  requiereDocumento: boolean;
  codigoDocumento: string;
}

// --- Tipos compartidos de facturación ---
export interface FacturaVistaDTO {
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
  turno?: string;
  codigoSucursal?: string;
  cajero?: string;
  caja?: string;
}

export interface FiltroFacturacion {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  cliente?: string;
  referencia?: string;
  almacen?: string;
  estado?: string;
}

export interface ResumenTipoNcfDTO {
  codigo: string;
  nombre: string;
  cantidad: number;
  totalMonto?: number;
}

export interface ResumenTipoNcfSucursalDTO {
  codigo: string;
  sucursal: number;
  cantidad: number;
}

export interface EnvioDGIIDTO {
  id?: number;
  ncf?: string;
  tipoDocumento?: number;
  tipoComprobante?: string;
  sucursal: number;
  transaccionID: number;
  fechaEnvio?: string;
  estado?: string;
  mensaje?: string;
  archivo?: string;
  codigoQR?: string;
}
