import { apiClient } from './client';
const BASE = '/ApiToken';
export const apiTokenApi = {
    renovar: async (id) => {
        const { data: response } = await apiClient.post(`${BASE}/renovar/${id}`);
        return response.data;
    },
    crear: async (data) => {
        const { data: response } = await apiClient.post(`${BASE}/crear`, data);
        return response.data;
    },
    listar: async () => {
        const { data: response } = await apiClient.get(`${BASE}/listar`);
        return response.data;
    },
    revocar: async (id) => {
        await apiClient.delete(`${BASE}/revocar/${id}`);
    },
};
