export interface DgiiApiConfigDTO {
  id: number;
  nombre: string;
  url: string;
  apiKeyEnmascarada: string;
  activa: boolean;
  observacion?: string;
  fechaCreacion?: string;
}

export interface DgiiApiConfigRequest {
  nombre: string;
  url: string;
  apiKey: string;
  observacion?: string;
}

export interface DgiiPruebaConexionDTO {
  exitosa: boolean;
  mensaje: string;
}
