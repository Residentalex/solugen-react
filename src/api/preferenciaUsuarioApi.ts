import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface PreferenciaUsuarioDTO {
  pantalla: string;
  clave: string;
  valor: string | null;
}

const BASE = '/PreferenciaUsuario';

export const preferenciaUsuarioApi = {
  obtenerPorPantalla: async (pantalla: string): Promise<PreferenciaUsuarioDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PreferenciaUsuarioDTO[]>>(`${BASE}/${pantalla}`);
    return data.data || [];
  },

  obtener: async (pantalla: string, clave: string): Promise<PreferenciaUsuarioDTO | null> => {
    const { data } = await apiClient.get<ApiResponse<PreferenciaUsuarioDTO | null>>(`${BASE}/${pantalla}/${clave}`);
    return data.data ?? null;
  },

  guardar: async (pantalla: string, clave: string, valor: string): Promise<void> => {
    await apiClient.put(`${BASE}/${pantalla}/${clave}`, { valor });
  },
};
