import { apiClient } from './client';
const buildParams = (filtros) => {
    const params = new URLSearchParams();
    params.set('desde', filtros.fechaInicial);
    params.set('hasta', filtros.fechaFinal);
    if (filtros.tipoDocumento)
        params.set('tipoDocumento', filtros.tipoDocumento);
    return params;
};
export const diarioGeneralApi = {
    generarPDF: async (sucursal, filtros) => {
        const params = buildParams(filtros);
        const { data } = await apiClient.get(`/reportes/diario-general/${sucursal}?${params.toString()}`, { responseType: 'blob' });
        return data;
    },
    obtenerDatos: async (sucursal, filtros) => {
        const params = buildParams(filtros);
        const { data } = await apiClient.get(`/reportes/diario-general/${sucursal}/datos?${params.toString()}`);
        return data.data ?? { items: [] };
    },
    imprimir: async (sucursal, filtros, items) => {
        const { data } = await apiClient.post(`/reportes/diario-general/${sucursal}/imprimir`, {
            items,
            fechaInicial: filtros.fechaInicial,
            fechaFinal: filtros.fechaFinal,
            tipoDocumento: filtros.tipoDocumento ?? '',
        }, { responseType: 'blob' });
        return data;
    }
};
