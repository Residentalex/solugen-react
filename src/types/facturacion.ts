// Basado en EntidadDTO.cs + ClienteDTO.cs del backend
export interface ClienteDTO {
  codigo: string;
  nombre: string;
  tipoIdentificacion: string; // enum string
  identificacion: string;
  correoElectronico: string;
  telefono: string;
  telefonoAdicional: string;
  direccion: string;
  nota: string;
  activo: boolean;
  idExterno?: string;
  // De EntidadDTO
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  codigoTipoEntidad?: string;
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
