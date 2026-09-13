import { apiClient } from './client';
const BASE = '/Configuracion';
export const configuracionApi = {
    obtener: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/empresa`);
        return data.data ?? null;
    },
    guardar: async (sucursal, config) => {
        await apiClient.put(`${BASE}/${sucursal}/empresa`, config);
    },
};
