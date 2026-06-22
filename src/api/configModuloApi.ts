import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/ConfigModulo';

export interface ConfigModuloDTO {
  modulo: string;
  clave: string;
  valor: string;
  tipo: string;
  descripcion?: string;
}

export const configModuloApi = {
  obtenerPorModulo: async (sucursal: number, modulo: string): Promise<Record<string, string>> => {
    const { data } = await apiClient.get<ApiResponse<ConfigModuloDTO[]>>(`${BASE}/${sucursal}/${modulo}`);
    const result: Record<string, string> = {};
    (data.data || []).forEach((cfg) => {
      result[cfg.clave] = cfg.valor;
    });
    return result;
  },

  obtenerListaCompleta: async (sucursal: number, modulo: string): Promise<ConfigModuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ConfigModuloDTO[]>>(`${BASE}/${sucursal}/${modulo}`);
    return data.data || [];
  },

  obtenerPorClave: async (sucursal: number, modulo: string, clave: string): Promise<ConfigModuloDTO | null> => {
    const { data } = await apiClient.get<ApiResponse<ConfigModuloDTO>>(`${BASE}/${sucursal}/${modulo}/${clave}`);
    return data.data ?? null;
  },

  crear: async (sucursal: number, dto: ConfigModuloDTO): Promise<ConfigModuloDTO> => {
    const { data } = await apiClient.post<ApiResponse<ConfigModuloDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, modulo: string, clave: string, dto: Partial<ConfigModuloDTO>): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/${modulo}/${clave}`, dto);
  },

  eliminar: async (sucursal: number, modulo: string, clave: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${modulo}/${clave}`);
  },
};
