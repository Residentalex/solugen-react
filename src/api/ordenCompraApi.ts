import { apiClient } from './client';
import type { OrdenCompraVistaDTO } from '../types/entradaAlmacen';

const BASE = '/ORC';

export const ordenCompraApi = {
  filtrar: async (
    sucursal: number,
    destino: number,
    params: {
      documento?: string;
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    // NOTA: este endpoint devuelve el array directamente (NO envuelto en {IsSuccess, Data})
    const { data } = await apiClient.get<OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}/filtrar`,
      { params: { ...params, destino } }
    );
    return data;
  },

  obtenerResumido: async (
    sucursal: number,
    destino: number,
    params: {
      suplidor?: string;
      desde?: string;
      hasta?: string;
      cantidad?: number;
      salto?: number;
    }
  ): Promise<OrdenCompraVistaDTO[]> => {
    const { data } = await apiClient.get<OrdenCompraVistaDTO[]>(
      `${BASE}/${sucursal}`,
      { params: { ...params, destino } }
    );
    return data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<any> => {
    // Este endpoint SI esta envuelto en {IsSuccess, Data, ErrorMessage}
    const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`, {
      params: { enp: true }
    });
    return data.data; // unwrap IsSuccess/Data/ErrorMessage
  },
};
