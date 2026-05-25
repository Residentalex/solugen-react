import { apiClient } from './client';

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
}

export const cuentaBancariaApi = {
  obtenerListado: async (sucursal: number): Promise<CuentaBancariaDTO[]> => {
    const { data } = await apiClient.get<CuentaBancariaDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },
};
