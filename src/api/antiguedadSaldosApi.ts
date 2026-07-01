import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { CategoriaEntidadDTO } from '../types/antiguedadSaldos';

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
    hasta: string,
    codEntidad?: string,
    codCategoria?: string,
    codSucursal?: string,
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.set('hasta', hasta);
    if (codEntidad) params.set('codEntidad', codEntidad);
    if (codCategoria) params.set('codCategoria', codCategoria);
    if (codSucursal) params.set('codSucursal', codSucursal);

    const { data } = await apiClient.get<Blob>(
      `/reportes/antiguedad-saldos/${sucursal}/${tipoEntidad}?${params.toString()}`,
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
