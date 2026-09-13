import { apiClient } from './client';
const BASE = '/GORC';
export const generadorOrcApi = {
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, search, estado) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        if (search)
            params.search = search;
        if (estado !== undefined)
            params.estado = estado;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, generador) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, generador);
        return data.data;
    },
    actualizar: async (sucursal, generador) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, generador);
        return data.data;
    },
    filtrar: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    obtenerDatosAnteriores: async (sucursal, codigos) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/datosAnterioresORC`, codigos);
        return data.data;
    },
    generarOC: async (sucursal, id) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generar/${id}`);
        return data.data;
    },
    obtenerOrdenes: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/ordenes`);
        return data.data;
    },
    obtenerExistencias: async (sucursal, codigos, fecha) => {
        const { data } = await apiClient.post(`/Existencia/${sucursal}/obtenerDatos`, codigos, { params: { fecha } });
        return data.data ?? [];
    },
};
