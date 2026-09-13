import { apiClient } from './client';
const BASE = '/Movimiento';
export const movimientoApi = {
    obtenerDetallado: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/detallado`, { params });
        return data.data;
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}/detallado`, { params });
        return data.data;
    },
    obtenerPorPlantilla: async (sucursal, plantilla, fecha) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla`, { params: { plantilla, fecha: fecha || new Date().toISOString() } });
        return data.data;
    },
};
