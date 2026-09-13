import { apiClient } from './client';
export const documentosReporteApi = {
    obtenerAutorizados: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`/ENP/${sucursal}/autorizados?desde=${desde}&hasta=${hasta}`);
        return data.data;
    },
    obtenerAplicados: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`/ENP/${sucursal}/aplicados?desde=${desde}&hasta=${hasta}`);
        return data.data;
    },
    imprimirReporte: async (sucursal, tipo, desde, hasta) => {
        const { data } = await apiClient.get(`/reportes/inventario/${tipo}/${sucursal}?desde=${desde}&hasta=${hasta}`, { responseType: 'blob' });
        return data;
    },
    imprimirReporteConDatos: async (sucursal, titulo, items, desde, hasta) => {
        const { data } = await apiClient.post(`/reportes/inventario/imprimir-por-datos/${sucursal}`, { titulo, items, fechaDesde: desde, fechaHasta: hasta }, { responseType: 'blob' });
        return data;
    },
};
