import { apiClient } from './client';
const BASE = '/ConfigPedidosYa';
export const configPedidosYaApi = {
    obtener: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data;
    },
    guardar: async (sucursal, config) => {
        await apiClient.post(`${BASE}/${sucursal}`, config);
    },
    eliminar: async (sucursal) => {
        await apiClient.delete(`${BASE}/${sucursal}`);
    },
};
