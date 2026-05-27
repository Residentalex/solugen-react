export interface OfertaDTO {
  nombre: string;
  fechaInicio: string;
  fechaFinal: string;
  activo: boolean;
  aplicaClienteCredito: boolean;
  codigo: string;
  detalles?: DetalleOfertaDTO[];
}

export interface DetalleOfertaDTO {
  ofertaID: string;
  codigo: string;
  articulo: string;
  precio: number;
  cantidad: number;
  cantidadOferta: number;
  cantidadMaxima: number;
  porcentajeDescuento: number;
  modificar: boolean;
}
