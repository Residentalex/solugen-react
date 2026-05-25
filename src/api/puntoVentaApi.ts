import { apiClient } from './client';
import type { PuntoVentaDTO, MetodoPagoDTO } from '../types/facturacion';
import type { ApiResponse } from '../types/auth';

const BASE = '/POS';

export const puntoVentaApi = {
  obtenerListado: async (sucursal: number): Promise<PuntoVentaDTO[]> => {
    const { data } = await apiClient.get<PuntoVentaDTO[]>(`${BASE}/${sucursal}`);
    return data; // devuelve array directo (similar a Producto)
  },

  obtenerMetodosPago: async (sucursal: number): Promise<MetodoPagoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<MetodoPagoDTO[]>>(`${BASE}/${sucursal}/metodos-pago`);
    return data.data;
  },
};
