import dayjs from 'dayjs';
import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { Reporte606DTO } from '../types/facturacion';

const BASE = '/R606';

function formatearFecha(d: dayjs.Dayjs): string {
  return d.format('YYYYMMDDHHmmss');
}

export const reporte606Api = {
  obtenerListado: async (sucursal: number, desde: dayjs.Dayjs, hasta: dayjs.Dayjs): Promise<Reporte606DTO[]> => {
    const { data } = await apiClient.get<ApiResponse<Reporte606DTO[]>>(`${BASE}/${sucursal}`, {
      params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
    });
    return data.data;
  },
};
