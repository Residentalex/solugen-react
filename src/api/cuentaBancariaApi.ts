import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionVistaDTO } from '../types/transaccion';

const BASE = '/CuentaBancaria';

export interface CuentaBancariaDTO {
  id: number;
  nombre: string;
  noCuenta: string;
  banco: string;
  codigoBanco: string;
  cuentaContable: string;
  agente: string;
  nota: string;
  activo: boolean;
  codigo: string;
  balance?: number;
  moneda?: string;
  codigoMoneda: string;
}

export const cuentaBancariaApi = {
  obtenerListado: async (sucursal: number): Promise<CuentaBancariaDTO[]> => {
    const { data } = await apiClient.get<CuentaBancariaDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },

  obtenerPorId: async (sucursal: number, codigo: string): Promise<CuentaBancariaDTO> => {
    const { data } = await apiClient.get<ApiResponse<CuentaBancariaDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  crear: async (sucursal: number, cuenta: Partial<CuentaBancariaDTO>): Promise<CuentaBancariaDTO> => {
    const { data } = await apiClient.post<ApiResponse<CuentaBancariaDTO>>(`${BASE}/${sucursal}`, cuenta);
    return data.data;
  },

  actualizar: async (sucursal: number, noCuenta: string, cuenta: Partial<CuentaBancariaDTO>): Promise<CuentaBancariaDTO> => {
    const { data } = await apiClient.put<ApiResponse<CuentaBancariaDTO>>(`${BASE}/${sucursal}/${noCuenta}`, cuenta);
    return data.data;
  },

  eliminar: async (sucursal: number, noCuenta: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${noCuenta}`);
  },

  obtenerMovimientos: async (
    sucursal: number,
    ctaBanc: string,
    params: { desde?: string; hasta?: string; cantidad?: number; salto?: number; busqueda?: string; estado?: number }
  ): Promise<TransaccionVistaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TransaccionVistaDTO[]>>(
      `${BASE}/${sucursal}/movimientos/${ctaBanc}`, { params }
    );
    return data.data;
  },
};
