export interface ServicioVistaDTO {
  codigo: string;
  nombre: string;
  referenciaInterna: string;
  precio: number;
  activo: boolean;
  familiaNombre: string;
  categoriaNombre: string;
  unidadMedidaNombre: string;
}

import type {
  FamiliaArticuloDTO,
  CategoriaArticuloDTO,
  UnidadMedidaDTO,
  ImpuestoProductoDTO,
} from './productos';

export interface ArticuloDTO {
  nombre: string;
  precio: number;
  referenciaInterna: string;
  familia: FamiliaArticuloDTO | null;
  categoria: CategoriaArticuloDTO | null;
  nota: string;
  paraVender: boolean;
  codigo: string;
  activo: boolean;
  idExterno: string;
  fechaCreacion: string;
  unidadMedida: UnidadMedidaDTO | null;
  impuestos: ImpuestoProductoDTO[];
}

export interface ServicioDTO extends ArticuloDTO {
  moneda: string;
}
