import type { FamiliaArticuloDTO } from './productos';

export interface DetalleActualizacionCostoDTO {
  id: number;
  idExterno: number;
  fecha: string;
  fechaDocumento?: string;
  codigo: string;
  producto: string;
  familia: FamiliaArticuloDTO | null;
  costoAntiguo: number;
  cantidad: number;
  documento: string;
  documentoReferencia: string;
  costoNuevo: number;
  turno: string;
  tipo: number;
}

export interface ActualizacionCostoDTO {
  fechaDesde: string;
  fechaHasta: string;
  nota?: string;
  usuario?: { id: number };
  detalles: DetalleActualizacionCostoDTO[];
  destino?: number;
}
