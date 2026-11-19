import type { AlmacenDTO, ConceptoDTO, MonedaDTO } from './entradaAlmacen';
import type { DocumentoDTO } from './documento';
import type { DetalleMovimientoDTO } from './notaCredito';

/**
 * Documento de ajuste de inventario (EPJ entrada de ajuste, SPJ salida de
 * ajuste). Es el contraparte frontend del `AjusteAlmacenDTO` del backend:
 * cabecera, concepto, almacen, moneda y lineas.
 *
 * A diferencia del listado (`MovimientoVistaDTO`, donde `documento` es un string
 * como "EPJ-02000055"), aqui `documento` es el objeto `DocumentoDTO` (ENTDOC) y
 * el numero legible se arma con `documento.codigo + '-' + noDocumento`.
 */
export interface AjusteAlmacenDTO {
  id: number;
  fechaDocumento: string;
  tipoDocumento: string;
  noDocumento: string;
  codigoConcepto: string;
  referencia: string;
  nota: string;
  estado: number;
  periodo: number;
  subTotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  almacen: AlmacenDTO | null;
  concepto: ConceptoDTO | null;
  codigoMoneda?: string;
  moneda: MonedaDTO | null;
  tasa?: number;
  documento: DocumentoDTO | null;
  detalles: DetalleMovimientoDTO[];
}
