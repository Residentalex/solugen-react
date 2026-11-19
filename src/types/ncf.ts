/** Rango de NCF (RCFXDOC) de una caja. */
export interface NcfRangoDTO {
  ncf1: string;
  tipo: string;
  usado: number;
  cant: number;
  disponibles: number;
  /** 1 = activo, 0 = inactivo. */
  activo: number;
  fechaVenc: string | null;
}

/** Rangos NCF de una caja, leidos de su PVLOCAL. */
export interface NcfCajaDTO {
  ip: string;
  noCaja: string;
  nombre: string;
  /** Motivo si no se pudieron leer los rangos. */
  error: string;
  rangos: NcfRangoDTO[];
}
