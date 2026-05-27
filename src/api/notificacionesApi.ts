import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { NotificacionVista, NotificacionConfig, EnviarNotificacionRequest, NotificacionSQLConfig, NotificacionSQLRequest } from '../types/notificaciones';

const getBase = (sucursal: number) => `/notificaciones/${sucursal}`;
const getBaseSQL = () => `/notificaciones/sql-config`;

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

  obtenerHistorial: async (sucursal: number, usuarioID: number): Promise<NotificacionVista[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionVista[]>>(`${getBase(sucursal)}/historial`, {
      params: { usuarioID }
    });
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
    const { data } = await apiClient.get<ApiResponse<any[]>>('/Usuario/Consolidado?activo=true');
    return data.data;
  },

  obtenerRoles: async (): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/Rol/Consolidado');
    return data.data;
  },

  /* ── Notificaciones Personalizadas SQL ── */

  obtenerSQLConfigs: async (): Promise<NotificacionSQLConfig[]> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionSQLConfig[]>>(`${getBaseSQL()}`);
    return data.data;
  },

  obtenerSQLConfig: async (id: number): Promise<NotificacionSQLConfig> => {
    const { data } = await apiClient.get<ApiResponse<NotificacionSQLConfig>>(`${getBaseSQL()}/${id}`);
    return data.data;
  },

  crearSQLConfig: async (req: NotificacionSQLRequest): Promise<number> => {
    const { data } = await apiClient.post<ApiResponse<number>>(`${getBaseSQL()}`, req);
    return data.data;
  },

  actualizarSQLConfig: async (id: number, req: NotificacionSQLRequest): Promise<void> => {
    await apiClient.put(`${getBaseSQL()}/${id}`, req);
  },

  eliminarSQLConfig: async (id: number): Promise<void> => {
    await apiClient.delete(`${getBaseSQL()}/${id}`);
  },

  probarSQLConfig: async (id: number): Promise<{ filas: Record<string, any>[]; total: number }> => {
    const { data } = await apiClient.post<ApiResponse<{ filas: Record<string, any>[]; total: number }>>(`${getBaseSQL()}/${id}/probar`);
    return data.data;
  },

  activarSQLConfig: async (id: number, activo: boolean): Promise<void> => {
    await apiClient.post(`${getBaseSQL()}/${id}/activar`, { activo });
  },

  probarSQLDirecto: async (sql: string, limite?: number): Promise<{ filas: Record<string, any>[]; total: number }> => {
    const { data } = await apiClient.post<ApiResponse<{ filas: Record<string, any>[]; total: number }>>(`${getBaseSQL()}/probar-directo`, { sql, limite });
    return data.data;
  },

  ejecutarSQLConfig: async (configID: number, limite: number = 100): Promise<{ filas: Record<string, any>[]; total: number }> => {
    const { data } = await apiClient.post<ApiResponse<{ filas: Record<string, any>[]; total: number }>>(`${getBaseSQL()}/${configID}/probar?limite=${limite}`);
    return data.data;
  },
};
