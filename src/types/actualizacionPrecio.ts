export interface ActualizacionPrecioDTO {
  documento: string;
  fecha: string;
  fechaParaAplicar: string;
  almacen: string;
  familia: string;
  docReferencia: string;
  estado: string;
  redondear: boolean;
  ajuste: number;
  autorizado: boolean;
}
