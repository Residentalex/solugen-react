import { apiClient } from './client';
import type { OfertaDTO } from '../types/oferta';

const BASE = '/Oferta';

export const ofertaApi = {
  obtenerListado: async (sucursal: number): Promise<OfertaDTO[]> => {
    const { data } = await apiClient.get<OfertaDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },
  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<OfertaDTO[]> => {
    const { data } = await apiClient.get<OfertaDTO[]>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },
  filtrar: async (
    sucursal: number,
    filtro: { cantidad?: number; salto?: number; busqueda?: string }
  ): Promise<OfertaDTO[]> => {
    const { data } = await apiClient.get<OfertaDTO[]>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data;
  },
  obtenerTotal: async (
    sucursal: number,
    params?: { busqueda?: string }
  ): Promise<number> => {
    const { data } = await apiClient.get<number>(`${BASE}/total/${sucursal}`, { params });
    return data;
  },
};
