import { apiClient } from './client';
const BASE = '/Accion';
export const accionApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, accion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, accion);
        return data.data;
    },
    actualizar: async (sucursal, id, accion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${id}`, accion);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
};
