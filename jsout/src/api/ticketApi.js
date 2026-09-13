import { apiClient } from './client';
const BASE = '/ticket';
export const ticketApi = {
    crear: async (sucursal, request) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/crear`, request);
        return data.data;
    },
    obtener: async (sucursal, ticketID) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${ticketID}`);
        return data.data;
    },
    responder: async (sucursal, ticketID, request) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/${ticketID}/responder`, request);
        return data.data;
    },
    cambiarEstado: async (sucursal, ticketID, request) => {
        await apiClient.put(`${BASE}/${sucursal}/${ticketID}/estado`, request);
    },
    obtenerPendientes: async (sucursal, usuarioID, cantidad, salto) => {
        const params = {};
        if (cantidad !== undefined)
            params.cantidad = cantidad;
        if (salto !== undefined)
            params.salto = salto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/pendientes/${usuarioID}`, { params });
        return data.data;
    },
};
