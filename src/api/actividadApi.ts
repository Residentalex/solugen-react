import type { Dayjs } from 'dayjs';
import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ActividadDTO,
  ActividadTotalesDTO,
  ActividadServicioDTO,
  CrearActividadRequest,
  ActualizarActividadRequest,
  CambiarEstadoActividadRequest,
  CrearServicioRequest,
  ActualizarServicioRequest,
} from '../types/actividad';

// La tabla ACTIVIDADES vive en Consolidado: las rutas NO llevan {sucursal}.
// El path base global (/api) lo aplica UsePathBase en el backend.
const BASE = '/Actividad';

export interface RangoFechas {
  desde: Dayjs;
  hasta: Dayjs;
}

export interface FiltrosCalendario {
  estado?: string;
  responsableId?: number;
  q?: string;
}

// Los query params desde/hasta se parsean en el backend con CadenaAFecha(),
// que espera yyyyMMddHHmmss. El rango es SEMIABIERTO [desde, hasta).
const formatearFecha = (fecha: Dayjs): string => fecha.format('YYYYMMDDHHmmss');

export const actividadApi = {
  obtenerCalendario: async (rango: RangoFechas, filtros?: FiltrosCalendario): Promise<ActividadDTO[]> => {
    const params: Record<string, string | number> = {
      desde: formatearFecha(rango.desde),
      hasta: formatearFecha(rango.hasta),
    };
    // Convencion del backend: vacio/0/ausente = "sin filtro".
    if (filtros?.estado) params.estado = filtros.estado;
    if (filtros?.responsableId) params.responsableId = filtros.responsableId;
    if (filtros?.q) params.q = filtros.q;
    const { data } = await apiClient.get<ApiResponse<ActividadDTO[]>>(`${BASE}/calendario`, { params });
    return data.data;
  },

  obtenerTotales: async (rango: RangoFechas): Promise<ActividadTotalesDTO> => {
    const { data } = await apiClient.get<ApiResponse<ActividadTotalesDTO>>(`${BASE}/totales`, {
      params: {
        desde: formatearFecha(rango.desde),
        hasta: formatearFecha(rango.hasta),
      },
    });
    return data.data;
  },

  obtenerServicios: async (): Promise<ActividadServicioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ActividadServicioDTO[]>>(`${BASE}/servicios`);
    return data.data;
  },

  obtenerPorId: async (id: number): Promise<ActividadDTO> => {
    const { data } = await apiClient.get<ApiResponse<ActividadDTO>>(`${BASE}/${id}`);
    return data.data;
  },

  crear: async (request: CrearActividadRequest): Promise<ActividadDTO> => {
    const { data } = await apiClient.post<ApiResponse<ActividadDTO>>(BASE, request);
    return data.data;
  },

  actualizar: async (id: number, request: ActualizarActividadRequest): Promise<ActividadDTO> => {
    const { data } = await apiClient.put<ApiResponse<ActividadDTO>>(`${BASE}/${id}`, request);
    return data.data;
  },

  cambiarEstado: async (id: number, request: CambiarEstadoActividadRequest): Promise<ActividadDTO> => {
    const { data } = await apiClient.put<ApiResponse<ActividadDTO>>(`${BASE}/${id}/estado`, request);
    return data.data;
  },

  eliminar: async (id: number): Promise<void> => {
    // 204 No Content: no se intenta parsear el cuerpo de la respuesta.
    await apiClient.delete(`${BASE}/${id}`);
  },

  // Catalogo de servicios. La baja es logica: el backend rechaza el DELETE
  // si el servicio tiene actividades activas asignadas y devuelve 400.
  crearServicio: async (request: CrearServicioRequest): Promise<ActividadServicioDTO> => {
    const { data } = await apiClient.post<ApiResponse<ActividadServicioDTO>>(`${BASE}/servicios`, request);
    return data.data;
  },

  actualizarServicio: async (id: number, request: ActualizarServicioRequest): Promise<ActividadServicioDTO> => {
    const { data } = await apiClient.put<ApiResponse<ActividadServicioDTO>>(`${BASE}/servicios/${id}`, request);
    return data.data;
  },

  bajaServicio: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/servicios/${id}`);
  },
};
