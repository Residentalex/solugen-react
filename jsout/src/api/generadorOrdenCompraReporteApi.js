import { apiClient } from './client';
export const generadorOrdenCompraReporteApi = {
    obtenerReporte: async (sucursal, idExterno) => {
        const { data } = await apiClient.get(`/ReporteGeneradorOrdenCompra/${sucursal}/${idExterno}`, { responseType: 'blob' });
        return data;
    },
};
