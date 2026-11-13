// DTOs de la pantalla Actualizaciones (tabla APP del Consolidado).

export interface AppEstadoDTO {
  /** NAME de la tabla APP: AGENTE, CAJA, GenMobile... */
  name: string;
  /** Version publicada en APP.VERSION */
  version: string;
  /** Ruta absoluta del binario en el servidor */
  ruta: string;
  /** Si el archivo existe en el servidor */
  existe: boolean;
  /** Tamano del archivo en bytes (0 si no existe) */
  bytes: number;
  /** Fecha de modificacion del archivo (ISO) */
  fechaModificacion: string | null;
}

export interface AppPublicacionDTO {
  app: string;
  version: string;
  ruta: string;
  bytes: number;
  latestYml?: boolean;
}
