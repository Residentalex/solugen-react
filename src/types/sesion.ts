/** Conexion abierta contra la base de una sucursal (MON$ATTACHMENTS). */
export interface SesionFirebirdDTO {
  attachmentId: number;
  usuario: string;
  ip: string;
  pid: number | null;
  /** 0 = idle, 1 = activo. */
  estado: number;
  conectadoDesde: string | null;
  transaccionDesde: string | null;
  transaccionesActivas: number;
  sentenciaActual: string;
  horasAbierta: number;
  inactiva: boolean;
}
