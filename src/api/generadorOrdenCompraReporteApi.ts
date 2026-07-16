import { apiClient } from './client';

export const generadorOrdenCompraReporteApi = {
  obtenerReporte: async (sucursal: number, idExterno: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(
      `/ReporteGeneradorOrdenCompra/${sucursal}/${idExterno}`,
      { responseType: 'blob' }
    );
    return data;
  },
};
