import { apiClient } from './client';
const BASE = '/Modulo';
export const moduloApi = {
    obtenerTodo: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data || [];
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, id, dto) => {
        await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
};
