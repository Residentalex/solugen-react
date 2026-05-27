export interface GeneradorOrdenCompraDTO {
  idExterno: string;
  numero: string;
  fecha: string;
  suplidor: { codigo: string; nombre: string } | null;
  almacen: string;
  notas: string;
  estado: number;
  total: number;
  detalles?: DetalleGeneradorDTO[];
}

export interface DetalleGeneradorDTO {
  codigo: string;
  referencia: string;
  producto: string;
  medida: { id: number; nombre: string } | null;
  impuesto: any | null;
  cantidades: Record<string, number> | null;
  cantidadesBonificadas: Record<string, number> | null;
  existencias: Record<string, number> | null;
  existenciasFisicas: Record<string, number> | null;
  costo: number;
  margen: number;
  precioSugerido: number;
  subTotal: number;
  porcentajeDescuento: number;
  descuento: number;
  impuestos: number;
  total: number;
}
