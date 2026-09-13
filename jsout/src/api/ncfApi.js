import { apiClient } from './client';
const BASE = '/NCF';
export const ncfApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data ?? [];
    },
};
