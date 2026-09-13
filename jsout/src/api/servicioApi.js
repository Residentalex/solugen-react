import { apiClient } from './client';
const BASE = '/Servicio';
export const servicioApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
    obtenerVista: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vista`, { params });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return data.data;
    },
};
