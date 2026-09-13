import { apiClient } from './client';
const BASE = '/Compania';
export const companiaApi = {
    obtenerTodas: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/todas/${sucursal}`);
        return Array.isArray(data) ? data : data?.data ?? [];
    },
};
