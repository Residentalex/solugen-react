import { apiClient } from './client';
import type { PuntoVentaDTO } from '../types/facturacion';

const BASE = '/POS';

export const puntoVentaApi = {
  obtenerListado: async (sucursal: number): Promise<PuntoVentaDTO[]> => {
    const { data } = await apiClient.get<PuntoVentaDTO[]>(`${BASE}/${sucursal}`);
    return data; // devuelve array directo (similar a Producto)
  },
};
