import type { UsuarioDTO } from './administracion';
import type { UnidadMedidaDTO } from './productos';

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
  tipo?: string;
  suplidor: SuplidorGORC | null;
  almacen: string;
  notas: string;
  estado: number;
  total: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  redondeo: boolean;
  creadoPor?: UsuarioDTO | null;
  validadoPor?: UsuarioDTO | null;
  logs?: LogGORC[];
  detalles?: DetalleGeneradorDTO[];
}

export interface DetalleGeneradorDTO {
  codigo: string;
  referencia: string;
  producto: string;
  medida?: UnidadMedidaDTO | null;
  impuesto: { nombre: string; porcentaje: number; codigo: string; idExterno: string } | null;
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
  ultimaCompraFecha?: string;
}

/** Datos de la ultima compra aplicada de un producto, devueltos por
 *  POST /GORC/{sucursal}/datosAnterioresORC. Corresponden a la ultima fila de
 *  DGENORC cuyo GENORC tiene APLICADA = 'T', ordenada por fecha e ID descendente. */
export interface DatosAnterioresORCDTO {
  codigo: string;
  costo: number;
  margen: number;
  precioSugerido: number;
  margenOP: number;
  precioSugeridoOP: number;
  porcientoDescuento: number;
  fecha?: string | null;
  medidaId: number;
}
