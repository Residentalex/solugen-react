import { apiClient } from './client';
const BASE = '/POS';
export const puntoVentaApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data; // devuelve array directo (similar a Producto)
    },
    obtenerMetodosPago: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/metodos-pago`);
        return data.data;
    },
    filtrarPuntosVenta: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    filtrarMetodosPago: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/metodos-pago/filtrar`, { params: filtro });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    obtenerTotalPuntosVenta: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data;
    },
};
