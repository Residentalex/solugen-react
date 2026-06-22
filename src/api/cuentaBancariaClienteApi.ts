import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CuentaBancariaClienteDTO } from '../types/facturacion';

const BASE = '/CuentaBancariaCliente';

export const cuentaBancariaClienteApi = {
  listar: async (sucursal: number, codigoCliente: string): Promise<CuentaBancariaClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CuentaBancariaClienteDTO[]>>(`${BASE}/${sucursal}/${codigoCliente}`);
    return data.data;
  },

  obtener: async (sucursal: number, codigoCliente: string, id: string): Promise<CuentaBancariaClienteDTO> => {
    const { data } = await apiClient.get<ApiResponse<CuentaBancariaClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, codigoCliente: string, payload: CuentaBancariaClienteDTO): Promise<CuentaBancariaClienteDTO> => {
    const { data } = await apiClient.post<ApiResponse<CuentaBancariaClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}`, payload);
    return data.data;
  },

  actualizar: async (sucursal: number, codigoCliente: string, id: string, payload: CuentaBancariaClienteDTO): Promise<CuentaBancariaClienteDTO> => {
    const { data } = await apiClient.put<ApiResponse<CuentaBancariaClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`, payload);
    return data.data;
  },

  eliminar: async (sucursal: number, codigoCliente: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
  },
};
