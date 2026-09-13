import { apiClient } from './client';
const BASE = '/IF';
export const conteoApi = {
    obtenerListado: async (sucursal, params) => {
        const queryParams = {};
        if (params.desde)
            queryParams.desde = params.desde;
        if (params.hasta)
            queryParams.hasta = params.hasta;
        if (params.cantidad)
            queryParams.cantidad = params.cantidad;
        if (params.salto)
            queryParams.salto = params.salto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params: queryParams });
        return data.data;
    },
    obtenerPorPlantilla: async (sucursal, plantillaId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla-conteo/${plantillaId}`);
        return data.data;
    },
    obtenerPlantillas: async (sucursal, codsup) => {
        const { data } = await apiClient.get(`${BASE}/plantilla/${sucursal}`, { params: codsup ? { codsup } : {} });
        return data;
    },
    obtenerPlantilla: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/plantilla/${sucursal}/${id}`);
        return data;
    },
    obtenerUltimos: async (sucursal, codigoSuplidor) => {
        const params = {};
        if (codigoSuplidor)
            params.codigoSuplidor = codigoSuplidor;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ultimos`, { params });
        return data.data;
    },
    obtenerUltimosConteosPorLista: async (sucursal, fecha, codigos) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/ultimosPorLista`, codigos, { params: { fecha } });
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    obtenerPorDocumento: async (sucursal, documento) => {
        const docSinPrefijo = documento.startsWith('IF-') ? documento.slice(3) : documento;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/documento/${encodeURIComponent(docSinPrefijo)}`);
        return data.data;
    },
};
