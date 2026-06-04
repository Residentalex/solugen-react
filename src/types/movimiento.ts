export interface MovimientoDTO {
  id?: number;
  fecha: string;
  documento: string;
  codigo: string;
  articulo: string;
  cantidad: number;
  costo: number;
  almacen: string;
  tipoDocumento: string;
  referencia?: string;
  entidad?: string;
  usuario?: string;
}
