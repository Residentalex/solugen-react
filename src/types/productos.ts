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
  familia: string;
  familiaID: number;
  categoria: string;
  categoriaCodigo: string;
  unidadMedida: string;
}

export interface FiltroProducto {
  cantidad?: number;
  salto?: number;
  codigo?: string;
  referencia?: string;
  sku?: string;
  familia?: string;
}
