import { apiClient } from './client';
const BASE = '/ORC';
export const ordenCompraApi = {
    filtrar: async (sucursal, destino, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: { ...params, destino } });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerResumido: async (sucursal, destino, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params: { ...params, destino } });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    anular: async (sucursal, ordenCompra) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, ordenCompra);
        return data.data;
    },
    postear: async (sucursal, ordenCompra) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, ordenCompra);
        return data.data;
    },
    revisado: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
    },
    verificarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/verificar`);
        return data.data;
    },
    descargarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
            responseType: 'blob',
        });
        return data;
    },
};
