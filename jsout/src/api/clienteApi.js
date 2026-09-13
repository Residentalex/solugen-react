import { apiClient } from './client';
const BASE = '/Cliente';
export const clienteApi = {
    obtenerVista: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vista`, { params });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    obtenerListado: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data;
    },
    obtenerActivos: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/activos`);
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo, signal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`, { signal });
        return data.data;
    },
    crear: async (sucursal, cliente) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, cliente);
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const params = {};
        if (filtro.cantidad != null)
            params.cantidad = filtro.cantidad;
        if (filtro.salto != null)
            params.salto = filtro.salto;
        if (filtro.codigo)
            params.codigo = filtro.codigo;
        if (filtro.activo !== undefined)
            params.activo = filtro.activo;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    actualizar: async (sucursal, cliente) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, cliente);
        return data.data;
    },
};
