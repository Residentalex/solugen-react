import { apiClient } from './client';
import type { ApiResponse, PantallaDTO } from '../types/auth';
import type { RolFullDTO } from '../types/administracion';

const BASE = '/Rol';

export const rolApi = {
  obtenerListado: async (sucursal: number): Promise<RolFullDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<RolFullDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<RolFullDTO> => {
    const { data } = await apiClient.get<ApiResponse<RolFullDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, rol: RolFullDTO): Promise<RolFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<RolFullDTO>>(`${BASE}/${sucursal}`, rol);
    return data.data;
  },

  actualizar: async (sucursal: number, rol: RolFullDTO): Promise<RolFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<RolFullDTO>>(`${BASE}/${sucursal}`, rol);
    return data.data;
  },

  obtenerPantallasDisponibles: async (sucursal: number): Promise<PantallaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PantallaDTO[]>>(`${BASE}/${sucursal}/pantallas-disponibles`);
    return data.data;
  },
};
