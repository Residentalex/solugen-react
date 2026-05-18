import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CuentaContableDTO } from '../types/contabilidad';

const BASE = '/CuentaContable';

export const cuentaContableApi = {
  obtenerListado: async (sucursal: number): Promise<CuentaContableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerAuxiliares: async (sucursal: number): Promise<CuentaContableDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaContableDTO[]>>(`${BASE}/${sucursal}/Auxiliares`);
    return data.data;
  },

  crear: async (sucursal: number, dto: Partial<CuentaContableDTO>): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.post<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}`, dto);
    return data.data;
  },

  actualizar: async (sucursal: number, noCuenta: string, dto: Partial<CuentaContableDTO>): Promise<CuentaContableDTO> => {
    const { data } = await apiClient.put<ApiResponse<CuentaContableDTO>>(`${BASE}/${sucursal}/${noCuenta}`, dto);
    return data.data;
  },

  eliminar: async (sucursal: number, noCuenta: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${noCuenta}`);
  },
};
