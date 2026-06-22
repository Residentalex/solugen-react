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
  nss?: string;
  telefono?: string;
  telefonoAdicional?: string;
  correoElectronico?: string;
  direccion?: string;
  activo?: boolean;
  sexo?: number;
  fechaNacimiento?: string;
  estadoCivil?: number;
  fechaIngreso?: string;
  fechaSalida?: string;
  salario?: number;
  tipoNomina?: number;
  tipoSangre?: string;
  alergias?: string;
  enfermedades?: string;
  contactoEmergencia?: string;
  nivelAcademico?: string;
  gradoAlcanzado?: string;
  lugarNacimiento?: string;
  posicion?: ReferenciaDTO;
  departamento?: ReferenciaDTO;
  compania?: ReferenciaDTO;
  tipoEntidad?: ReferenciaDTO;
  categoria?: ReferenciaDTO;
  horarioId?: string;
  notas?: string;
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

  crear: async (sucursal: number, empleado: EmpleadoDTO): Promise<EmpleadoDTO> => {
    const { data } = await apiClient.post<ApiResponse<EmpleadoDTO>>(`/Empleado/${sucursal}`, empleado);
    return data.data;
  },

  actualizar: async (sucursal: number, codigo: string, empleado: EmpleadoDTO): Promise<EmpleadoDTO> => {
    const { data } = await apiClient.put<ApiResponse<EmpleadoDTO>>(`/Empleado/${sucursal}/${codigo}`, empleado);
    return data.data;
  },
};
