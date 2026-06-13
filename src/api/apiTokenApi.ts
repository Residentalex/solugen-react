import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface AuthApiTokenCrearRequestDTO {
  usuarioID: number;
  nombre: string;
  sucursalID?: number;
}

export interface AuthApiTokenResponseDTO {
  id: number;
  nombre: string;
  token: string;
  creadoEn: string;
  ultimoUso: string | null;
  activo: boolean;
}

export interface AuthApiTokenListadoDTO {
  id: number;
  nombre: string;
  usuarioID: number;
  nombreUsuario: string;
  creadoEn: string;
  ultimoUso: string | null;
  activo: boolean;
}

const BASE = '/api/ApiToken';

export const apiTokenApi = {
  renovar: async (id: number): Promise<AuthApiTokenResponseDTO> => {
    const { data: response } = await apiClient.post<ApiResponse<AuthApiTokenResponseDTO>>(`${BASE}/renovar/${id}`);
    return response.data;
  },

  crear: async (data: AuthApiTokenCrearRequestDTO): Promise<AuthApiTokenResponseDTO> => {
    const { data: response } = await apiClient.post<ApiResponse<AuthApiTokenResponseDTO>>(`${BASE}/crear`, data);
    return response.data;
  },

  listar: async (): Promise<AuthApiTokenListadoDTO[]> => {
    const { data: response } = await apiClient.get<ApiResponse<AuthApiTokenListadoDTO[]>>(`${BASE}/listar`);
    return response.data;
  },

  revocar: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/revocar/${id}`);
  },
};
