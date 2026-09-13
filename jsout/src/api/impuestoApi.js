import { apiClient } from './client';
const BASE = '/Impuesto';
export const impuestoApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data;
    },
    obtenerParaCompras: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ParaCompras`);
        return data.data ?? data;
    },
    obtenerParaVentas: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ParaVentas`);
        return data.data ?? data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, codigo, dto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${codigo}`, dto);
        return data.data;
    },
    eliminar: async (sucursal, codigo) => {
        await apiClient.delete(`${BASE}/${sucursal}/${codigo}`);
    },
};
