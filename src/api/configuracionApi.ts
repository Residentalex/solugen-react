import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

const BASE = '/Configuracion';

export interface ConfiguracionEmpresa {
  nombre: string;
  rnc: string;
  telefono: string;
  fax: string;
  direccion: string;
  slogan: string;
  fechaCierre: string | null;
  fechaCierreInventario: string | null;
  fechaCierreFiscal: string | null;
  metodoFacturacionDGII: string;
  orcEnUnidades: boolean;
}

export const configuracionApi = {
  obtener: async (sucursal: number): Promise<ConfiguracionEmpresa | null> => {
    const { data } = await apiClient.get<ApiResponse<ConfiguracionEmpresa>>(
      `${BASE}/${sucursal}/empresa`
    );
    return data.data ?? null;
  },

  guardar: async (sucursal: number, config: ConfiguracionEmpresa): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/empresa`, config);
  },
};
