import { apiClient } from './client';

export interface ReporteDevolucionesAlmacenParams {
  desde?: string;
  hasta?: string;
  agrupado?: number;
  detallado?: boolean;
  codigo?: string;
  almacen?: string;
  familia?: string;
  cuenta?: string;
}

export const reporteDevolucionesAlmacenApi = {
  imprimir: async (sucursal: number, params: ReporteDevolucionesAlmacenParams): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/reportes/inventario/devoluciones/${sucursal}`,
      { params, responseType: 'blob' }
    );
    return data;
  },
};
