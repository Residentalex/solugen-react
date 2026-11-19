// DTOs del módulo de Promociones (backend: DTOs/Facturacion/PromocionDTO.cs).
// Los IDs (id, familiaId, grupoId) son string, coincidiendo con el backend.

export interface PromocionListadoDTO {
  id: string;
  descripcion: string;
  fechaInicio: string;
  fechaFinal: string;
  activa: boolean;
  credito: boolean;
  cupones: number | null;
  tramos: number;
  familias: number;
  grupos: number;
}

export interface PromocionDTO {
  id: string;
  descripcion: string;
  referencia: string;
  fechaInicio: string;
  fechaFinal: string;
  fechaCuponInicio: string;
  fechaCuponFinal: string;
  horaInicio: string;
  horaFinal: string;
  activa: boolean;
  credito: boolean;
  cupones: number | null;
  cupComp: number;
  formato: string;
  familias: PromocionFamiliaDTO[];
  grupos: PromocionGrupoDTO[];
  tramos: PromocionRangoDTO[];
  advertencias: string[];
}

export interface PromocionFamiliaDTO {
  familiaId: string;
  nombre: string;
  promocion: boolean;
  consumo: boolean;
}

export interface PromocionGrupoDTO {
  grupoId: string;
  descripcion: string;
  nivel: number;
  productos: number;
  promocion: boolean;
}

export interface PromocionRangoDTO {
  id: string;
  montoInicio: number;
  montoFin: number;
  cuponPct: number;
  cuponMonto: number;
  compraMinima: number;
}

export interface PromocionCatalogoFamiliaDTO {
  id: string;
  nombre: string;
}

export interface PromocionCatalogoGrupoDTO {
  codigo: string;
  descripcion: string;
  nivel: number;
  productos: number;
}
