import type { UnidadMedidaDTO } from './productos';

export interface ProductoRecetaDTO {
  codigo: string;
  nombre: string;
  cantidadIngredientes: number;
}

export interface IngredienteDTO {
  id: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  costo: number;
  unidadMedida?: UnidadMedidaDTO;
}

/** Componente editable de un producto padre. Persiste en PRODCOMP. */
export interface ComponenteProductoDTO {
  codigo: string;
  cantidad: number;
}

export interface ErrorImportacionComponenteDTO {
  fila: number;
  mensaje: string;
}

/** Resultado de parsear la plantilla de componentes. No persiste nada. */
export interface ResultadoImportacionComponenteDTO {
  total: number;
  validos: number;
  errores: ErrorImportacionComponenteDTO[];
  componentes: ComponenteProductoDTO[];
}
