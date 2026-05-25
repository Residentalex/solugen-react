import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { NotificacionVista, NotificacionConfig, EnviarNotificacionRequest } from '../types/notificaciones';

const getBase = (sucursal: number) => `/notificaciones/${sucursal}`;

export const notificacionesApi = {
  obtenerPendientes: async (sucursal: number, usuarioID: number): Promise<NotificacionVista[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionVista[]>>(`${getBase(sucursal)}/pendientes?usuarioID=${usuarioID}`);
    return data.data;
  },

  obtenerCantidadPendientes: async (sucursal: number, usuarioID: number): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${getBase(sucursal)}/pendientes/cantidad?usuarioID=${usuarioID}`);
    return data.data;
  },

  marcarComoLeida: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.put(`${getBase(sucursal)}/${id}/leer`);
  },

  enviar: async (sucursal: number, request: EnviarNotificacionRequest): Promise<void> => {
    await apiClient.post(`${getBase(sucursal)}/enviar`, request);
  },

  obtenerEnviadas: async (sucursal: number, usuarioID: number): Promise<NotificacionVista[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionVista[]>>(`${getBase(sucursal)}/enviadas?usuarioID=${usuarioID}`);
    return data.data;
  },

  obtenerConfig: async (sucursal: number): Promise<NotificacionConfig[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionConfig[]>>(`${getBase(sucursal)}/config`);
    return data.data;
  },

  guardarConfig: async (sucursal: number, config: NotificacionConfig): Promise<void> => {
    await apiClient.post(`${getBase(sucursal)}/config`, config);
  },

  obtenerUsuarios: async (): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/Usuario/Consolidado/activos');
    return data.data;
  },

  obtenerRoles: async (): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/Rol/Consolidado');
    return data.data;
  },
};
