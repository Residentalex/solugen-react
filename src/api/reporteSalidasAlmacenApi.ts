import { apiClient } from './client';

export interface ReporteSalidasAlmacenParams {
  desde?: string;
  hasta?: string;
  agrupado?: number;
  detallado?: boolean;
  codigo?: string;
  almacen?: string;
  familia?: string;
  cuenta?: string;
}

export const reporteSalidasAlmacenApi = {
  imprimir: async (sucursal: number, params: ReporteSalidasAlmacenParams): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/reportes/inventario/salidas/${sucursal}`,
      { params, responseType: 'blob' }
    );
    return data;
  },
};
