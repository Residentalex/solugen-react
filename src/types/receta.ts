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
