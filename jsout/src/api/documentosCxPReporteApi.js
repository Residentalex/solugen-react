import { apiClient } from './client';
export const documentosCxPReporteApi = {
    obtenerAutorizados: async (sucursal, moduloId, desde, hasta, tipoDocumento) => {
        const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
        if (tipoDocumento)
            params.set('tipoDocumento', tipoDocumento);
        const { data } = await apiClient.get(`/reportes/cuentasporpagar/autorizados/${sucursal}/datos?${params}`);
        return data.data;
    },
    obtenerAplicados: async (sucursal, moduloId, desde, hasta, tipoDocumento) => {
        const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
        if (tipoDocumento)
            params.set('tipoDocumento', tipoDocumento);
        const { data } = await apiClient.get(`/reportes/cuentasporpagar/aplicados/${sucursal}/datos?${params}`);
        return data.data;
    },
    imprimirReporte: async (sucursal, moduloId, tipo, desde, hasta, tipoDocumento) => {
        const params = new URLSearchParams({ desde, hasta, moduloId: String(moduloId) });
        if (tipoDocumento)
            params.set('tipoDocumento', tipoDocumento);
        const { data } = await apiClient.get(`/reportes/cuentasporpagar/${tipo}/${sucursal}?${params}`, { responseType: 'blob' });
        return data;
    },
    imprimirReporteConDatos: async (sucursal, titulo, items, desde, hasta) => {
        const { data } = await apiClient.post(`/reportes/cuentasporpagar/imprimir-por-datos/${sucursal}`, { titulo, items, fechaDesde: desde, fechaHasta: hasta }, { responseType: 'blob' });
        return data;
    },
};
