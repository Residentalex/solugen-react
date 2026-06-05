import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { TransaccionVistaDTO } from '../types/transaccion';

const BASE = '/CuentaBancaria';

export interface CuentaBancariaDTO {
  nombre: string;
  noCuenta: string;
  banco: string;
  cuentaContable: string;
  agente: string;
  nota: string;
  activo: boolean;
  codigo: string;
  balance?: number;
  moneda?: string;
}

export const cuentaBancariaApi = {
  obtenerListado: async (sucursal: number): Promise<CuentaBancariaDTO[]> => {
    const { data } = await apiClient.get<CuentaBancariaDTO[]>(`${BASE}/${sucursal}`);
    return data;
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
