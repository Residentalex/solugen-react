import { apiClient } from './client';
const BASE = '/Moneda';
export const monedaApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    crear: async (sucursal, moneda) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, moneda);
        return data.data;
    },
    actualizar: async (sucursal, id, moneda) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${id}`, moneda);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
};
