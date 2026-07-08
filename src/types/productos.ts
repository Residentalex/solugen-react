export interface ProductoVistaDTO {
  codigo: string;
  nombre: string;
  referencia: string;
  precio: number;
  ultimoCosto: number;
  activo: boolean;
  familiaNombre: string;
  categoriaNombre: string;
  unidadMedidaNombre: string;
}

export interface ProductoListaDTO {
  codigo: string;
  nombre: string;
  precio: number;
  referencia: string;
  refFabricante: string;
  ultimoCosto: number;
  activo: boolean;
  paraVender: boolean;
  paraComprar: boolean;
  familia: { nombre?: string; idExterno?: string } | null;
  familiaID: number;
  categoria: { nombre?: string; codigo?: string; idExterno?: string } | null;
  categoriaCodigo: string;
  unidadMedida: { nombre?: string; idExterno?: string } | null;
}

export interface FiltroProducto {
  cantidad?: number;
  salto?: number;
  codigo?: string;
  referencia?: string;
  sku?: string;
  familia?: string;
  activo?: boolean;
}

export interface FamiliaArticuloDTO {
  nombre?: string;
  idExterno?: string;
  aumentoPrecioMaximo?: number;
  cuentaCostoVenta?: string;
  cuentaIngresosVenta?: string;
  cuentaDescuentoVenta?: string;
  cuentaDeVolucionVenta?: string;
  cuentaCostoCompra?: string;
  cuentaDevolucionCompra?: string;
}

export interface CategoriaArticuloDTO {
  nombre?: string;
  codigo?: string;
  idExterno?: string;
  control?: CategoriaArticuloDTO | null;
  grupo?: CategoriaArticuloDTO | null;
}

export interface UnidadMedidaDTO {
  nombre?: string;
  codigo?: string;
  factor?: number;
  idExterno?: number;
}

export interface ImpuestoProductoDTO {
  impuesto: {
    nombre?: string;
    porcentaje?: number;
    tipo?: number;
    ambito?: number | string;
    codigo?: string;
    noCuenta?: string;
    idExterno?: string;
  } | null;
}

export interface DatosExtraProductoDTO {
  idExterno?: string;
  codigoControl?: string;
  productoControl?: string;
  unidadMedidaCompra?: UnidadMedidaDTO | null;
  ubicacion?: string;
  margenBeneficio?: number;
  paraAlquilar?: boolean;
  paraExportar?: boolean;
  productoTerminado?: boolean;
  pesado?: boolean;
  garantia?: number;
  esComodin?: boolean;
}

export interface ProductoDTO {
  codigo: string;
  nombre: string;
  precio: number;
  referenciaInterna: string;
  upc?: string;
  familia?: FamiliaArticuloDTO | null;
  categoria?: CategoriaArticuloDTO | null;
  nota?: string;
  paraVender: boolean;
  paraComprar: boolean;
  activo: boolean;
  idExterno?: string;
  fechaCreacion?: string;
  unidadMedida?: UnidadMedidaDTO | null;
  impuestos?: ImpuestoProductoDTO[];
  ultimoCosto: number;
  pesado?: boolean;
  productoControl?: ProductoDTO | null;
  datosExtra?: DatosExtraProductoDTO | null;
  requiereFechaVenc?: boolean;
  diasVencimiento?: number;
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

export interface ResultadoImportacionDTO {
  total: number;
  insertados: number;
  actualizados: number;
  errores: ErrorImportacionDTO[];
  productos?: ProductoImportadoDTO[];
}

export interface ErrorImportacionDTO {
  fila: number;
  mensaje: string;
}

export interface ProductoImportadoDTO {
  fila: number;
  nombre: string;
  codigoGenerado: string;
  referencia?: string;
  upc?: string;
  precio?: number;
  ultimoCosto?: number;
  familia?: string;
  categoria?: string;
  impuesto?: string;
  impuestoVenta?: string;
  unidadMedida?: string;
  paraVender?: string;
  paraComprar?: string;
  requiereFechaVenc?: string;
  diasVencimiento?: number;
  pesado?: string;
  suplidor?: string;
}
