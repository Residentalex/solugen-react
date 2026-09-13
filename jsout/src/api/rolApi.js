import { apiClient } from './client';
const BASE = '/Rol';
export const rolApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, rol) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, rol);
        return data.data;
    },
    actualizar: async (sucursal, rol) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, rol);
        return data.data;
    },
    obtenerPantallasDisponibles: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/pantallas-disponibles`);
        return data.data;
    },
};
