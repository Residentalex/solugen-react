import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { GrupoProductoClienteDTO } from '../types/facturacion';

const BASE = '/GrupoProductoCliente';

export const grupoProductoClienteApi = {
  listar: async (sucursal: number, codigoCliente: string): Promise<GrupoProductoClienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<GrupoProductoClienteDTO[]>>(`${BASE}/${sucursal}/${codigoCliente}`);
    return data.data;
  },

  obtener: async (sucursal: number, codigoCliente: string, id: string): Promise<GrupoProductoClienteDTO> => {
    const { data } = await apiClient.get<ApiResponse<GrupoProductoClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, codigoCliente: string, payload: GrupoProductoClienteDTO): Promise<GrupoProductoClienteDTO> => {
    const { data } = await apiClient.post<ApiResponse<GrupoProductoClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}`, payload);
    return data.data;
  },

  actualizar: async (sucursal: number, codigoCliente: string, id: string, payload: GrupoProductoClienteDTO): Promise<GrupoProductoClienteDTO> => {
    const { data } = await apiClient.put<ApiResponse<GrupoProductoClienteDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`, payload);
    return data.data;
  },

  eliminar: async (sucursal: number, codigoCliente: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
  },
};
