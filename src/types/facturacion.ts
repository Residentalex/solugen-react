export interface ResumenTipoNcfDTO {
  codigo: string;
  nombre: string;
  cantidad: number;
  totalMonto: number;
}

export interface ResumenTipoNcfSucursalDTO {
  codigo: string;
  nombre: string;
  sucursal: number;
  cantidad: number;
  totalMonto: number;
}

export interface EnvioDGIIDTO {
  id: number;
  fecha: string;
  tipoDocumento: number;
  sucursal: number;
  documento: string;
  cliente: string;
  transaccionID: number;
  tipoComprobante: string;
  ncf: string;
  codigoQR: string;
  codigoSecuencia: string;
  fechaEnvio?: string;
  fechaVencimiento?: string;
  respuestaDGII: string;
  firma: string;
  enviado: boolean;
}
