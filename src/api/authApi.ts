import { apiClient } from './client';
import type { AuthLoginRequest, AuthSesionDTO } from '../types/auth';

export interface CambiarClaveRequest {
  usuarioID: number;
  claveActual: string;
  claveNueva: string;
}

export const authApi = {
  login: async (request: AuthLoginRequest): Promise<AuthSesionDTO> => {
    const { data } = await apiClient.post('/auth/login', request);
    return data.data;
  },

  refresh: async (request: {
    refreshToken: string;
    equipo: string;
    ip: string;
    sucursal: number;
  }): Promise<AuthSesionDTO> => {
    const { data } = await apiClient.post('/auth/refresh', request);
    return data.data;
  },

  cambiarClave: async (request: CambiarClaveRequest): Promise<void> => {
    await apiClient.post('/auth/cambiar-clave', request);
  },
};
