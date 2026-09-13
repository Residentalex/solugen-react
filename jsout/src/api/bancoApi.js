import { apiClient } from './client';
const BASE = '/Banco';
export const bancoApi = {
    obtenerListado: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data;
    },
};
