// Tipos del modulo de Actividades (agenda).
// Reflejan el contrato del backend SolugenApi-0.2:
//   DTOs/Administracion/ActividadDTO.cs

export const ESTADOS_ACTIVIDAD = [
  'Pendiente',
  'Confirmado',
  'EnProceso',
  'Completado',
  'Cancelado',
  'Reprogramado',
] as const;

export type EstadoActividad = (typeof ESTADOS_ACTIVIDAD)[number];

export interface ActividadDTO {
  id: number;
  numero: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  servicioId: number | null;
  servicioNombre: string | null;
  servicioColor: string | null;
  responsableId: number | null;
  responsableNombre: string | null;
  clienteCodigo: string | null;
  clienteNombre: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  sucursalId: number;
  sucursalNombre: string | null;
  usuarioCreacionId: number | null;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  activo: boolean;
}

export interface ActividadTotalesDTO {
  total: number;
  pendiente: number;
  confirmado: number;
  enProceso: number;
  completado: number;
  cancelado: number;
  reprogramado: number;
}

export interface ActividadServicioDTO {
  id: number;
  codigo: string;
  nombre: string;
  color: string | null;
  orden: number;
  activo: boolean;
}

// Las fechas viajan como string. Para ESCRITURA el backend las lee como
// DateTime desde el JSON (ver CrearActividadRequest/ActualizarActividadRequest
// en el backend), por lo que se envian en ISO (YYYY-MM-DDTHH:mm:ss).
export interface CrearActividadRequest {
  titulo: string;
  descripcion: string;
  estado: string;
  servicioId: number;
  responsableId: number;
  clienteCodigo: string;
  clienteNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  sucursalId: number;
}

export type ActualizarActividadRequest = CrearActividadRequest;

export interface CambiarEstadoActividadRequest {
  estado: string;
}

// Alta/edicion del catalogo de servicios. El codigo es opcional: si no
// viene, el backend lo deriva del nombre. El color es opcional y cae al
// primario del sistema (#556EE6) si no se informa.
export interface CrearServicioRequest {
  codigo?: string;
  nombre: string;
  color?: string;
  orden?: number;
}

export interface ActualizarServicioRequest {
  codigo?: string;
  nombre: string;
  color?: string;
  orden?: number;
  activo: boolean;
}
