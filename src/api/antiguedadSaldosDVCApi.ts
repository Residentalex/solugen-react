import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export const antiguedadSaldosDVCApi = {
  obtenerBalances: async (
    sucursal: number,
    hasta: string,
    codEntidad?: string,
    codTipo?: string,
    codSucursal?: string,
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    params.set('hasta', hasta);
    if (codEntidad) params.set('codEntidad', codEntidad);
    if (codTipo) params.set('codTipo', codTipo);
    if (codSucursal) params.set('codSucursal', codSucursal);

    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `/DVC/${sucursal}/balances?${params.toString()}`
    );
    return data.data;
  },

  generarPDF: async (
    sucursal: number,
    hasta: string,
    codEntidad?: string,
    codTipo?: string,
    codSucursal?: string,
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.set('hasta', hasta);
    if (codEntidad) params.set('codEntidad', codEntidad);
    if (codTipo) params.set('codTipo', codTipo);
    if (codSucursal) params.set('codSucursal', codSucursal);

    const { data } = await apiClient.get<Blob>(
      `/reportes/antiguedad-saldos-dvc/${sucursal}?${params.toString()}`,
      { responseType: 'blob' }
    );
    return data;
  },

  obtenerTipos: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `/Tipo/${sucursal}?entdoc=DVC`
    );
    return data.data;
  },
};
