import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PersonaAutorizadaDTO } from '../types/facturacion';

const BASE = '/PersonaAutorizada';

export const personaAutorizadaApi = {
  listar: async (sucursal: number, codigoCliente: string): Promise<PersonaAutorizadaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PersonaAutorizadaDTO[]>>(`${BASE}/${sucursal}/${codigoCliente}`);
    return data.data;
  },

  obtener: async (sucursal: number, codigoCliente: string, id: string): Promise<PersonaAutorizadaDTO> => {
    const { data } = await apiClient.get<ApiResponse<PersonaAutorizadaDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, codigoCliente: string, payload: PersonaAutorizadaDTO): Promise<PersonaAutorizadaDTO> => {
    const { data } = await apiClient.post<ApiResponse<PersonaAutorizadaDTO>>(`${BASE}/${sucursal}/${codigoCliente}`, payload);
    return data.data;
  },

  actualizar: async (sucursal: number, codigoCliente: string, id: string, payload: PersonaAutorizadaDTO): Promise<PersonaAutorizadaDTO> => {
    const { data } = await apiClient.put<ApiResponse<PersonaAutorizadaDTO>>(`${BASE}/${sucursal}/${codigoCliente}/${id}`, payload);
    return data.data;
  },

  eliminar: async (sucursal: number, codigoCliente: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
  },
};
