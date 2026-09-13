import { apiClient } from './client';
const BASE = '/FAM';
export const familiaArticuloApi = {
    obtenerTodo: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtener: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
};
