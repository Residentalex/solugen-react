import { apiClient } from './client';
const BASE = '/Documento';
export const documentosApi = {
    obtenerListado: async (sucursal, modulo) => {
        const params = {};
        if (modulo !== undefined)
            params.modulo = modulo;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data || [];
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return data.data || { datos: [], total: 0 };
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data || 0;
    },
    crear: async (sucursal, documento) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, documento);
        return data.data;
    },
    actualizar: async (sucursal, id, documento) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${id}`, documento);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
    obtenerPorId: async (sucursal, id) => {
        try {
            const { data } = await apiClient.get(`${BASE}/${sucursal}/por-id/${id}`);
            return data.data || null;
        }
        catch {
            return null;
        }
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        try {
            const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
            return data.data || null;
        }
        catch {
            return null;
        }
    },
};
