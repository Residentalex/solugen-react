import type { DocumentoDTO } from './documento';
import type { EntidadDTO, ConceptoDTO, MonedaDTO, AlmacenDTO, AsientoContableDTO, LogDTO } from './entradaAlmacen';
import type { DetalleFacturaPOSDTO } from './facturaPOS';

export interface CotizacionVentaDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  cliente: string;
  concepto: string;
  total: number;
  estado: number;
  periodo: number;
  nota?: string;
  documento: DocumentoDTO;
}

export interface CotizacionVentaDetalleDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: number;
  noDocumento: string;
  cliente: string;
  concepto: ConceptoDTO;
  moneda: MonedaDTO;
  entidad: EntidadDTO;
  documento: DocumentoDTO;
  ncf: string;
  ncfModificado?: string;
  nota: string;
  referencia: string;
  tasa: number;
  diasCredito?: number;
  fechaVencimiento?: string;
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  estado: number;
  periodo: number;
  modo?: string;
  creadoPor?: { nombre: string };
  usuario?: { nombre: string };
  almacen?: AlmacenDTO;
  sucursal?: any;
  detalles: DetalleFacturaPOSDTO[];
  asientos: AsientoContableDTO[];
  logs: LogDTO[];
  impuestosFactura?: any[];
}

export interface FiltroCotizacionVenta {
  cantidad?: number;
  salto?: number;
  desde?: string;
  hasta?: string;
  documento?: string;
  concepto?: string;
  cliente?: string;
}
