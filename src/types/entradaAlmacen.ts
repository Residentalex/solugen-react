export interface MovimientoVistaDTO {
  id: number;
  fecha: string;
  documento: string;
  entidad: string;
  diasCredito: number;
  concepto: string;
  almacenOrigen: string;
  almacenDestino: string;
  ordenCompra: string;
  referencia: string;
  ncf: string;
  total: number;
  estado: number;
  periodo: number;
  codigoSucursal: string;
}

export interface FiltroENP {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  nCF?: string;
  concepto?: string;
  entidad?: string;
  referencia?: string;
  almacen?: string;
}

// Tipos para el detalle completo de una Entrada de Almacen
export interface EntidadDTO {
  nombre: string;
  codigo: string;
  identificacion: string;
  telefono?: string;
  direccion?: string;
  requiereORC?: boolean;
}

export interface ConceptoDTO {
  nombre: string;
  codigo: string;
  docAGenerar?: string;
}

export interface MonedaDTO {
  nombre: string;
  simbolo: string;
  codigo: string;
}

export interface AlmacenDTO {
  nombre: string;
  codigo: string;
}

export interface SuplidorDTO {
  nombre: string;
  codigo: string;
  identificacion: string;
  telefono?: string;
  direccion?: string;
  requiereORC?: boolean;
  diasCredito?: number;
}

export interface OrdenCompraDTO {
  id: number;
  noDocumento: string;
}

export interface DetalleEntradaAlmacenDTO {
  id: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  costo: number;
  precio: number;
  subTotal: number;
  descuento: number;
  porcentajeDescuento: number;
  impuestos: number;
  porcentajeImpuesto: number;
  total: number;
  tipoArticulo: string;
  nota?: string;
  fechaVencimiento?: string;
  flete: number;
  costoActual: number;
  ajustado: boolean;
  cantidadBonificable: number;
}

export interface AsientoContableDTO {
  id: number;
  cuentaContable: {
    noCuenta: string;
    nombre: string;
  };
  descripcion: string;
  tipoAsiento: number | string;
  monto: number;
  generado: boolean;
}

export interface LogDTO {
  fecha: string;
  usuario: {
    nombre: string;
    nombreUsuario: string;
  };
  accion: number;
  descripcion: string;
  estacion: string;
}

import type { DocumentoDTO } from './documento';

export interface EntradaAlmacenDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  estado: number;
  periodo: number;
  ncf: string;
  ncfModificado: string;
  referencia: string;
  nota: string;
  diasCredito: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  retenciones: number;
  total: number;
  tasa: number;
  documento: DocumentoDTO;
  entidad: EntidadDTO;
  concepto: ConceptoDTO;
  moneda: MonedaDTO;
  almacen: AlmacenDTO;
  suplidor: SuplidorDTO;
  sucursal: any;
  codigoSucursal?: string;
  ordenCompra: OrdenCompraDTO;
  detalles: DetalleEntradaAlmacenDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  revisado?: boolean;
  actualizarCostos?: boolean;
  codigoAlmacenOrigen?: string;
  codigoAlmacenDestino?: string;
  fechaEntrega?: string;
  recibidoPor?: string;
}

// ===== Tipos para Orden de Compra (ORC) =====
export interface OrdenCompraVistaDTO {
  id: number;
  noDocumento: string;
  fechaDocumento: string;
  suplidor: { id: number; nombre: string; codigo: string; telefono?: string };
  concepto: { codigo: string; nombre: string };
  total: number;
  estado: number;
}

export interface DetalleOrdenCompraVistaDTO {
  id: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  costo: number;
  subTotal: number;
  descuento: number;
  porcentajeDescuento: number;
  impuestos: number;
  total: number;
  cantidadRecibida: number;
  cantidadBonificable: number;
  medida: { id: number; nombre: string; factor: number };
}
