export interface JobHangfire {
  id: string;
  nombre: string;
  cron: string;
  ultimoEstado: 'Exitoso' | 'Fallido' | 'Ejecutando' | 'NuncaEjecutado';
  ultimaEjecucion: string | null;
  proximaEjecucion: string | null;
  duracionSegundos: number | null;
  error: string | null;
  sucursal: string | null;
  modulo: string | null;
  activo: boolean;
}

export interface JobHangfireResumen {
  jobs: JobHangfire[];
  total: number;
  fallidos: number;
  exitosos: number;
}

export interface JobParametro {
  nombre: string;
  tipo: string; // "sucursal" | "horas" | "destino" | "cron"
  label: string;
  requerido: boolean;
  default?: string;
}

export interface JobTemplate {
  tipoJobId: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  parametros: JobParametro[];
  sucursalesSugeridas?: string[];
  cronDefault: string;
}
