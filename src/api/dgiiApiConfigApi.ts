import { apiClient } from './client';
import type { DgiiApiConfigDTO, DgiiApiConfigRequest, DgiiPruebaConexionDTO } from '../types/dgiiApiConfig';

const BASE = '/ConfiguracionDgii';

export const dgiiApiConfigApi = {
  obtenerTodas: async (): Promise<DgiiApiConfigDTO[]> => {
    const { data } = await apiClient.get(`${BASE}`);
    return data?.data ?? [];
  },

  crear: async (request: DgiiApiConfigRequest): Promise<DgiiApiConfigDTO> => {
    const { data } = await apiClient.post(`${BASE}`, request);
    return data.data;
  },

  actualizar: async (id: number, request: DgiiApiConfigRequest): Promise<DgiiApiConfigDTO> => {
    const { data } = await apiClient.put(`${BASE}/${id}`, request);
    return data.data;
  },

  activar: async (id: number): Promise<void> => {
    await apiClient.patch(`${BASE}/${id}/activar`);
  },

  desactivar: async (id: number): Promise<void> => {
    await apiClient.patch(`${BASE}/${id}/desactivar`);
  },

  eliminar: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  probar: async (request: DgiiApiConfigRequest): Promise<DgiiPruebaConexionDTO> => {
    const { data } = await apiClient.post(`${BASE}/probar`, request);
    return data.data;
  },
};
