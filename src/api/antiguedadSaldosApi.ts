import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CategoriaEntidadDTO, TransaccionBalanceDTO } from '../types/antiguedadSaldos';

export const antiguedadSaldosApi = {
  obtenerBalances: async (
    sucursal: number,
    tipoEntidad: string,
    hasta: string,
    codEntidad?: string,
    codCategoria?: string,
    codSucursal?: string,
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    params.set('hasta', hasta);
    if (codEntidad) params.set('codEntidad', codEntidad);
    if (codCategoria) params.set('codCategoria', codCategoria);
    if (codSucursal) params.set('codSucursal', codSucursal);

    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `/Transaccion/${sucursal}/${tipoEntidad}/balances?${params.toString()}`
    );
    return data.data;
  },

  generarPDF: async (
    sucursal: number,
    tipoEntidad: string,
    payload: { hasta: string; detallado: boolean; datos: TransaccionBalanceDTO[] },
  ): Promise<Blob> => {
    const { data } = await apiClient.post<Blob>(
      `/reportes/antiguedad-saldos/${sucursal}/${tipoEntidad}`,
      payload,
      { responseType: 'blob' }
    );
    return data;
  },

  obtenerCategorias: async (
    sucursal: number,
    tipo: string,
  ): Promise<CategoriaEntidadDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<CategoriaEntidadDTO[]>>(
      `/categoriaentidad/${sucursal}/tipo/${tipo}`
    );
    return data.data;
  },
};
