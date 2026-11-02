import { apiClient } from './client';

export interface ReporteEntradasAlmacenParams {
  desde?: string;
  hasta?: string;
  agrupado?: number;
  detallado?: boolean;
  codigo?: string;
  almacen?: string;
  familia?: string;
  cuenta?: string;
}

export const reporteEntradasAlmacenApi = {
  imprimir: async (sucursal: number, params: ReporteEntradasAlmacenParams): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/reportes/inventario/entradas/${sucursal}`,
      { params, responseType: 'blob' }
    );
    return data;
  },
};
