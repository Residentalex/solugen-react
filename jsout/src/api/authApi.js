import { apiClient } from './client';
export const authApi = {
    login: async (request) => {
        const { data } = await apiClient.post('/auth/login', request);
        return data.data;
    },
    refresh: async (request) => {
        const { data } = await apiClient.post('/auth/refresh', request);
        return data.data;
    },
    cambiarClave: async (request) => {
        await apiClient.post('/auth/cambiar-clave', request);
    },
    obtenerPantallasPorSucursal: async (sucursal, usuarioID) => {
        const { data } = await apiClient.get(`/Usuario/${sucursal}/${usuarioID}/pantallas-por-sucursal`);
        return data;
    },
    obtenerSucursalesAuth: async () => {
        const { data } = await apiClient.get('/Auth/sucursales');
        return Array.isArray(data) ? data : data?.data ?? [];
    },
};
