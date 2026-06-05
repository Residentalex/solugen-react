import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

interface ReferenciaDTO {
  codigo?: string;
  nombre?: string;
  idExterno?: string;
}

export interface EmpleadoDTO {
  id?: number;
  codigo: string;
  nombre: string;
  nombre1?: string;
  nombre2?: string;
  apellido1?: string;
  apellido2?: string;
  identificacion?: string;
  telefono?: string;
  telefonoAdicional?: string;
  correoElectronico?: string;
  direccion?: string;
  activo?: boolean;
  posicion?: ReferenciaDTO;
  departamento?: ReferenciaDTO;
  compania?: ReferenciaDTO;
  tipoEntidad?: ReferenciaDTO;
}

export const empleadoApi = {
  obtenerTodos: async (sucursal: number): Promise<EmpleadoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EmpleadoDTO[]>>(`/Empleado/${sucursal}`);
    return data.data || [];
  },

  obtenerPaginado: async (sucursal: number, cantidad?: number, salto?: number): Promise<EmpleadoDTO[]> => {
    const params: Record<string, number> = {};
    if (cantidad !== undefined) params.cantidad = cantidad;
    if (salto !== undefined) params.salto = salto;
    const { data } = await apiClient.get<ApiResponse<EmpleadoDTO[]>>(`/Empleado/${sucursal}`, { params });
    return data.data || [];
  },

  obtenerListado: async (sucursal: number, busqueda: string, cantidad: number, salto: number): Promise<{ datos: EmpleadoDTO[]; total: number }> => {
    const params: Record<string, string | number> = { cantidad, salto };
    if (busqueda) params.busqueda = busqueda;
    const { data } = await apiClient.get(`/Empleado/${sucursal}/listado`, { params });
    return { datos: data.data || [], total: data.total || 0 };
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<EmpleadoDTO> => {
    const { data } = await apiClient.get(`/Empleado/${sucursal}/${codigo}`);
    return data?.data || data;
  },
};
