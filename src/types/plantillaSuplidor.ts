export interface PlantillaSuplidorDTO {
  id: string;
  numero: string;
  fecha: string;
  codigoSuplidor: string;
  nombreSuplidor: string;
  tipo?: string;
  notas?: string;
  usuarioId?: number;
  detalles?: DetallePlantillaSuplidorDTO[];
}

export interface DetallePlantillaSuplidorDTO {
  id?: string;
  plantillaSuplidorId?: string;
  orden: number;
  codigoProducto: string;
  descripcion: string;
  referencia?: string;
  unidadMedida?: number;
  nombrePresentacion?: string;
  eliminar?: string;
}
