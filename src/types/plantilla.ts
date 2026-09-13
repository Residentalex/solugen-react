export interface DetallePlantillaConteoFisicoDTO {
  plantillaID: string;
  orden: number;
  codigo: string;
  producto: string;
  presentacionID: string;
  presentacion: string;
  factor: string;
  referencia: string;
  familiaID: string;
  familia: string;
}

export interface PlantillaConteoFisicoDTO {
  iD: string;
  suplidorID: string;
  suplidor: string;
  codigo: string;
  detalles: DetallePlantillaConteoFisicoDTO[];
}
