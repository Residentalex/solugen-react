import { apiClient } from './client';
const BASE = '/RCT';
export const recetaApi = {
    obtenerProductosConReceta: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerIngredientes: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
};
