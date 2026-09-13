import { apiClient } from './client';
const BASE = '/Chat';
export const chatApi = {
    obtenerConversaciones: async () => {
        const { data } = await apiClient.get(`${BASE}/conversaciones`);
        return data.data;
    },
    obtenerMensajes: async (conversacionId, cantidad = 50, salto = 0) => {
        const { data } = await apiClient.get(`${BASE}/conversaciones/${conversacionId}/mensajes`, { params: { cantidad, salto } });
        return data.data;
    },
    obtenerMensajesRecientes: async (conversacionId, ultimoId) => {
        const { data } = await apiClient.get(`${BASE}/conversaciones/${conversacionId}/mensajes/recientes`, { params: { ultimoId } });
        return data.data;
    },
    enviarMensaje: async (conversacionId, request) => {
        const { data } = await apiClient.post(`${BASE}/conversaciones/${conversacionId}/mensajes`, request);
        return data.data;
    },
    crearConversacion: async (request) => {
        const { data } = await apiClient.post(`${BASE}/conversaciones`, request);
        return data.data;
    },
    marcarLeido: async (conversacionId) => {
        await apiClient.post(`${BASE}/conversaciones/${conversacionId}/leer`);
    },
    eliminarConversacion: async (conversacionId) => {
        await apiClient.delete(`${BASE}/conversaciones/${conversacionId}`);
    },
    contarNoLeidos: async () => {
        const { data } = await apiClient.get(`${BASE}/no-leidos`);
        return data.data;
    },
    buscarUsuarios: async (nombre) => {
        const { data } = await apiClient.get(`${BASE}/usuarios`, {
            params: { nombre: nombre || '' },
        });
        return data.data;
    },
    subirAdjunto: async (conversacionId, file) => {
        const formData = new FormData();
        formData.append('archivo', file);
        const { data } = await apiClient.post(`${BASE}/conversaciones/${conversacionId}/adjuntos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.data;
    },
    descargarAdjunto: async (adjuntoId) => {
        const { data } = await apiClient.get(`${BASE}/adjuntos/${adjuntoId}/descargar`, { responseType: 'blob' });
        return data;
    },
};
