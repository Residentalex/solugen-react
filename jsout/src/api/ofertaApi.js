import { apiClient } from './client';
const BASE = '/Oferta';
export const ofertaApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return data;
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data;
    },
};
