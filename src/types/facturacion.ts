// Basado en EntidadDTO.cs + ClienteDTO.cs del backend

// --- DTOs anidados para Cliente ---
export interface TipoEntidadDTO {
  codigo: string;
  nombre: string;
  idExterno?: string;
}

export interface CategoriaEntidadDTO {
  id: number;
  codigo: string;
  nombre: string;
  idExterno?: string;
  numeroCuenta?: string;
}

export interface TipoComprobanteNCFDTO {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  idExterno?: string;
}

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

  // De EntidadDTO - nuevos campos
  sector?: string;
  ciudad?: string;
  zona?: string;
  nombreComercial?: string;
  contacto?: string;
  telefonoContacto?: string;
  fax?: string;
  fechaIngreso?: string;   // DateTime? del backend
  tipoEntidad?: TipoEntidadDTO;
  categoria?: CategoriaEntidadDTO;
  cuentaContable?: import('./contabilidad').CuentaContableDTO;

  // De ClienteDTO extra - existentes
  limiteCredito: number;
  diasCredito: number;
  creditoSuspendido: boolean;
  exentoImpuesto: boolean;
  margen: number;
  porcientoDescuento: number;

  // De ClienteDTO extra - nuevos campos
  tipoNcf?: TipoComprobanteNCFDTO;
  codigoVendedor?: string;
  vendedorNombre?: string;
  codigoListaPrecio?: string;
  listaPrecioNombre?: string;
  perfil?: string;
  balance?: number;
  comision?: number;
  fechaUltimoPago?: string;
  montoUltimoPago?: number;
  documentoUltimoPago?: string;
  facebook?: string;
  twitter?: string;
  codigoMoneda?: string;
}

export interface ClienteVistaDTO {
  codigo: string;
  nombre: string;
  identificacion: string;
  telefono: string;
  correoElectronico: string;
  activo: boolean;
  vendedorNombre: string;
  balance: number;
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
  identificacion?: string;
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

// --- DTOs para tabs de ClienteDetalle (Fase 2) ---

export interface PersonaAutorizadaDTO {
  id?: string;
  codigoCliente?: string;
  codigo?: string;
  nombre: string;
  cedula?: string;
  telefono?: string;
  fax?: string;
  email?: string;
  direccion?: string;
  noContrato?: string;
  creditoFiscal?: boolean;
}

export interface GrupoProductoClienteDTO {
  id?: string;
  codigoCliente?: string;
  codigoGrupo?: string;
  nombreGrupo?: string;
  porcentajeDescuento?: number;
}

export interface CuentaBancariaClienteDTO {
  id?: string;
  codigo?: string;
  nombre?: string;
  codigoBanco?: string;
  cuentaBancaria?: string;
  tipoCuenta?: string;
  codigoMoneda?: string;
  inactiva?: boolean;
  porDefecto?: boolean;
  numeroCuentaContable?: string;
}

export interface EnvioDGIIDTO {
  id?: number;
  ncf?: string;
  tipoDocumento?: number;
  tipoComprobante?: string;
  sucursal: number;
  sucursalNombre?: string;
  transaccionID: number;
  fechaEnvio?: string;
  estado?: string;
  mensaje?: string;
  archivo?: string;
  codigoQR?: string;
  fecha?: string;          // c.fecha del SQL
  documento?: string;      // c.documento del SQL
  cliente?: string;        // c.nombre AS cliente del SQL
  respuestaDGII?: string;  // n.respDGII del SQL - mensaje de error
}

// --- DTOs para ContactosTab (Teléfonos, Emails, Contactos, Direcciones múltiples) ---

export interface EntidadTelefonoDTO {
  id: number;
  codigoEntidad: string;
  tipo: string;
  numero: string;
  extension: string;
  principal: boolean;
}

export interface EntidadEmailDTO {
  id: number;
  codigoEntidad: string;
  tipo: string;
  email: string;
  principal: boolean;
}

export interface EntidadContactoDTO {
  id: number;
  codigoEntidad: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  principal: boolean;
}

export interface EntidadDireccionDTO {
  id: number;
  codigoEntidad: string;
  tipo: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  sector: string;
  principal: boolean;
}
