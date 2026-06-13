import { apiClient } from './client';
import type { ApiResponse, AuthPermisoEspecialDTO, PermisoEspecialRequestDTO, PermisoEspecialConAsignacionDTO, PermisoEspecialConRolDTO } from '../types/auth';

const BASE = '/PermisoEspecial';

export const permisoEspecialApi = {
  obtenerListado: async (sucursal: number): Promise<AuthPermisoEspecialDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AuthPermisoEspecialDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<AuthPermisoEspecialDTO> => {
    const { data } = await apiClient.get<ApiResponse<AuthPermisoEspecialDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, permiso: PermisoEspecialRequestDTO): Promise<AuthPermisoEspecialDTO> => {
    const { data } = await apiClient.post<ApiResponse<AuthPermisoEspecialDTO>>(`${BASE}/${sucursal}`, permiso);
    return data.data;
  },

  actualizar: async (sucursal: number, permiso: PermisoEspecialRequestDTO): Promise<AuthPermisoEspecialDTO> => {
    const { data } = await apiClient.put<ApiResponse<AuthPermisoEspecialDTO>>(`${BASE}/${sucursal}`, permiso);
    return data.data;
  },

  obtenerPorPantalla: async (sucursal: number, pantallaId: number): Promise<PermisoEspecialConAsignacionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PermisoEspecialConAsignacionDTO[]>>(`${BASE}/${sucursal}/por-pantalla/${pantallaId}`);
    return data.data;
  },

  asignarAPantalla: async (sucursal: number, pantallaId: number, permisoIds: number[]): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/asignar-pantalla`, { pantallaId, permisoIds });
  },

  obtenerPorRol: async (sucursal: number, rolId: number): Promise<PermisoEspecialConRolDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PermisoEspecialConRolDTO[]>>(`${BASE}/${sucursal}/por-rol/${rolId}`);
    return data.data;
  },

  asignarARol: async (sucursal: number, rolId: number, permisos: { permisoId: number; valor: boolean }[]): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/asignar-rol`, { rolId, permisos });
  },
};
