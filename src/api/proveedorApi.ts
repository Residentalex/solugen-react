import { apiClient } from './client';
import type { SuplidorDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/Proveedor';

export const proveedorApi = {
  obtenerListado: async (sucursal: number, cantidad?: number, salto?: number): Promise<SuplidorDTO[]> => {
    const params: Record<string, number> = {};
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`${BASE}/${sucursal}?activo=true`, { params });
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<SuplidorDTO> => {
    const { data } = await apiClient.get<SuplidorDTO>(`${BASE}/${sucursal}/${codigo}`);
    return data;
  },

  filtrar: async (sucursal: number, codigo?: string, suplidor?: string): Promise<SuplidorDTO[]> => {
    const params: Record<string, string> = {};
    if (codigo) params.codigo = codigo;
    if (suplidor) params.suplidor = suplidor;
    params.activo = 'true';
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerLibresORC: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`${BASE}/${sucursal}/noOrc`);
    return data.data;
  },
};
