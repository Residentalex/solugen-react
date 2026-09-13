// Tipos para la pantalla de consulta de documentos por referencia (RMOVDOC)

export interface ProductoRmovdoc {
  codigo: string;
  articulo: string;
  cantidad: number;
  costo: number;
  descuento: number;
  subTotal: number;
  impuestos: number;
  total: number;
}

export interface EncabezadoRmovdoc {
  noDocumento?: string;
  fecha?: string;
  suplidor?: string;
  total?: number;
  monedaSimbolo?: string;
  monedaNombre?: string;
}

export interface ResultadoRmovdoc {
  prefijo: string;
  numero: string;
  referencia: string;
  encabezado: EncabezadoRmovdoc;
  productos: ProductoRmovdoc[];
}
