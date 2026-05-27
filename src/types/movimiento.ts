export interface MovimientoDTO {
  id?: number;
  fecha: string;
  documento: string;
  codigoArticulo: string;
  articulo: string;
  cantidad: number;
  costo: number;
  almacen: string;
  tipoDocumento: string;
  referencia?: string;
  entidad?: string;
  usuario?: string;
}
