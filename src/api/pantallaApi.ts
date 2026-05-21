import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PantallaDTO, ModuloDTO } from '../types/auth';
import type { AccionDTO } from '../types/administracion';

const BASE = '/Pantalla';

export const pantallaApi = {
  obtenerListado: async (sucursal: number): Promise<PantallaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<PantallaDTO[]>>(`${BASE}/${sucursal}`);
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<PantallaDTO> => {
    const { data } = await apiClient.get<ApiResponse<PantallaDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, pantalla: PantallaDTO): Promise<PantallaDTO> => {
    const { data } = await apiClient.post<ApiResponse<PantallaDTO>>(`${BASE}/${sucursal}`, pantalla);
    return data.data;
  },

  actualizar: async (sucursal: number, pantalla: PantallaDTO): Promise<PantallaDTO> => {
    const { data } = await apiClient.put<ApiResponse<PantallaDTO>>(`${BASE}/${sucursal}`, pantalla);
    return data.data;
  },

  obtenerModulos: async (sucursal: number): Promise<ModuloDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ModuloDTO[]>>(`${BASE}/${sucursal}/modulos`);
    return data.data;
  },

  obtenerAcciones: async (sucursal: number): Promise<AccionDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AccionDTO[]>>(`${BASE}/${sucursal}/acciones`);
    return data.data;
  },
};
