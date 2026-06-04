export interface MovimientoArticuloAgrupadoDTO {
  articulo: string;
  codigo: string;
  prefijo: string;
  ultimaCompra: string | null;
  ultimaVenta: string | null;
  tiempo: string;
  ventas: number;
  compras: number;
  transferencias: number;
  existencia: number;
  sucursal: string;
}
