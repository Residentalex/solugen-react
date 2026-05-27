export type TipoDocInventario = 'ENP' | 'SAP' | 'TRP' | 'DVC';

export const TIPO_DOC_LABELS: Record<TipoDocInventario, string> = {
  ENP: 'Entrada de Almacén',
  SAP: 'Salida de Almacén',
  TRP: 'Transferencia de Almacén',
  DVC: 'Devolución de Compra',
};

export const TIPO_DOC_ROUTES: Record<TipoDocInventario, string> = {
  ENP: '/FENP/',
  SAP: '/FSAP/',
  TRP: '/FTRP/',
  DVC: '/FDVC/',
};

export interface DetalleImportarDTO {
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
}
