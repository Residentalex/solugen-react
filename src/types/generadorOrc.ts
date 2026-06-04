export interface SuplidorGORC {
  idExterno: string;
  codigo: string;
  nombre: string;
  diasCredito: number;
  rnc: string;
  identificacion: string;
  telefono: string;
  direccion: string;
}

export interface LogGORC {
  fecha: string;
  usuario: string;
  accion: number;
  descripcion: string;
}

export interface GeneradorOrdenCompraDTO {
  id?: number | string;
  idExterno: string;
  numero: string;
  fecha: string;
  suplidor: SuplidorGORC | null;
  almacen: string;
  notas: string;
  estado: number;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  redondeo: number;
  creadoPor: string;
  validadoPor: string;
  logs?: LogGORC[];
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
