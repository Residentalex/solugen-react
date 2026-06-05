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

/** DTO individual devuelto por GET /Movimiento/{sucursal}/plantilla */
export interface MovimientoArticuloDTO {
  articulo: string;
  codigo: string;
  familia: string;
  tipoDocumento: string;
  cantidad: number;
  cantidadAlterna: number;
  costo: number;
  costoAlterno: number;
  concepto: string;
  documento: string;
  almacen: string;
  entidad: string;
  sucursal: string;
  tipoArticulo: string;
  estado: string;
  nota: string;
  id: number;
  noCuenta: string;
  fecha: string;
}
