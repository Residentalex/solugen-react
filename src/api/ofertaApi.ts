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
};
