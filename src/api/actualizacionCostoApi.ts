import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DetalleActualizacionCostoDTO, ActualizacionCostoDTO } from '../types/actualizacionCosto';

const BASE = '/ActualizacionCosto';

export const actualizacionCostoApi = {
  obtenerPendientes: async (
    sucursal: number,
    desde: string,
    hasta: string,
    docs: string
  ): Promise<DetalleActualizacionCostoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DetalleActualizacionCostoDTO[]>>(
      `${BASE}/${sucursal}`,
      { params: { desde, hasta, docs } }
    );
    return data.data;
  },

  aplicar: async (sucursal: number, payload: ActualizacionCostoDTO): Promise<void> => {
    await apiClient.put(`${BASE}/${sucursal}/CrearActualizacionCosto`, payload);
  },
};
