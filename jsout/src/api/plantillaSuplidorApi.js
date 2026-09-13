import { apiClient } from './client';
const BASE = '/PlantillaSuplidor';
export const plantillaSuplidorApi = {
    obtenerTodo: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data || [];
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, dto) => {
        await apiClient.put(`${BASE}/${sucursal}`, dto);
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
    imprimir: async (sucursal, id) => {
        const { data } = await apiClient.get(`/reportes/compras/plantilla-suplidor/${sucursal}/${id}`, { responseType: 'blob' });
        return data;
    },
};
