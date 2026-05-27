import { apiClient } from './client';
import type { ApiResponse, PantallaDTO } from '../types/auth';
import type { UsuarioDTO, CrearUsuarioRequest } from '../types/administracion';

const BASE = '/Usuario';

export const usuarioApi = {
  obtenerListado: async (sucursal: number, activo?: boolean): Promise<UsuarioDTO[]> => {
    const params: Record<string, string | boolean> = {};
    if (activo !== undefined) params.activo = activo;
    const { data } = await apiClient.get<ApiResponse<UsuarioDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (sucursal: number, cuenta?: string, nombre?: string): Promise<UsuarioDTO[]> => {
    const params: Record<string, string> = {};
    if (cuenta) params.cuenta = cuenta;
    if (nombre) params.nombre = nombre;
    const { data } = await apiClient.get<ApiResponse<UsuarioDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<UsuarioDTO> => {
    const { data } = await apiClient.get<ApiResponse<UsuarioDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, usuario: CrearUsuarioRequest): Promise<UsuarioDTO> => {
    const { data } = await apiClient.post<ApiResponse<UsuarioDTO>>(`${BASE}/${sucursal}`, usuario);
    return data.data;
  },

  actualizar: async (sucursal: number, usuario: UsuarioDTO): Promise<UsuarioDTO> => {
    const { data } = await apiClient.put<ApiResponse<UsuarioDTO>>(`${BASE}/${sucursal}`, usuario);
    return data.data;
  },

  resetearPassword: async (sucursal: number, id: number): Promise<string> => {
    const { data } = await apiClient.post<ApiResponse<string>>(`${BASE}/${sucursal}/${id}/resetear-password`);
    return data.data;
  },

  cambiarEstado: async (sucursal: number, id: number, activo: boolean): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${id}/estado`, { activo });
  },

  obtenerPantallasPorRoles: async (sucursal: number, roleIds: number[]): Promise<PantallaDTO[]> => {
    const { data } = await apiClient.post(`${BASE}/${sucursal}/pantallas-por-roles`, roleIds);
    if (Array.isArray(data)) return data as PantallaDTO[];
    if (data?.data && Array.isArray(data.data)) return data.data as PantallaDTO[];
    return [];
  },
};
