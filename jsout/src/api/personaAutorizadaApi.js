import { apiClient } from './client';
const BASE = '/PersonaAutorizada';
export const personaAutorizadaApi = {
    listar: async (sucursal, codigoCliente) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigoCliente}`);
        return data.data;
    },
    obtener: async (sucursal, codigoCliente, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
        return data.data;
    },
    crear: async (sucursal, codigoCliente, payload) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/${codigoCliente}`, payload);
        return data.data;
    },
    actualizar: async (sucursal, codigoCliente, id, payload) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${codigoCliente}/${id}`, payload);
        return data.data;
    },
    eliminar: async (sucursal, codigoCliente, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${codigoCliente}/${id}`);
    },
};
