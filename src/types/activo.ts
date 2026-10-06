export interface ActivoDTO {
  id: string;
  codigo: string;
  descripcion: string;
  fechaAdq: string;
  clasific: string;
  clasificacionDesc: string;
  tipo: string;
  tipoDesc: string;
  ubicacion: string;
  ubicacionDesc: string;
  noSerie: string;
  referencia: string;
  documento: string;
  edificio: boolean;
  retirado: boolean;
  noGenDepr: boolean;
  ctaActivo: string;
  ctaGasto: string;
  ctaDeprAcum: string;
  vidaUtil: number;
  tasa: number;
  valorAdq: number;
  ajustes: number;
  deprAcum: number;
  deprMens: number;
  periodDep: number;
  depreAcumV: number;
  deprMensV: number;
  archivo: string;
}

export interface ActivoCatalogoDTO {
  codigo: string;
  descripcion: string;
}

export interface ActivoCatalogosDTO {
  clasificaciones: ActivoCatalogoDTO[];
  tipos: ActivoCatalogoDTO[];
  ubicaciones: ActivoCatalogoDTO[];
}

export interface CrearActivoRequest {
  codigo: string;
  descripcion: string;
  fechaAdq: string;
  clasific: string;
  tipo: string;
  ubicacion: string;
  noSerie: string;
  referencia: string;
  documento: string;
  edificio: boolean;
  noGenDepr: boolean;
  ctaActivo: string;
  ctaGasto: string;
  ctaDeprAcum: string;
  vidaUtil: number;
  tasa: number;
  valorAdq: number;
  ajustes: number;
}

export type ActualizarActivoRequest = CrearActivoRequest;
