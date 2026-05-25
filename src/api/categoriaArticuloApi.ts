import { apiClient } from './client';
import type { CategoriaArticuloDTO } from '../types/productos';

const BASE = '/CategoriaArticulo';

export const categoriaArticuloApi = {
  obtenerListado: async (sucursal: number): Promise<CategoriaArticuloDTO[]> => {
    const { data } = await apiClient.get<CategoriaArticuloDTO[]>(`${BASE}/${sucursal}`);
    return data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<CategoriaArticuloDTO> => {
    const { data } = await apiClient.get<CategoriaArticuloDTO>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },
};
