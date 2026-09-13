import { apiClient } from './client';
const BASE = '/CuentaBancaria';
export const cuentaBancariaApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data;
    },
    obtenerMovimientos: async (sucursal, ctaBanc, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/movimientos/${ctaBanc}`, { params });
        return data.data;
    },
};
