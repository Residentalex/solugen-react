import { apiClient } from './client';
const BASE = '/ADP';
export const actualizacionPrecioApi = {
    obtenerResumido: async (sucursal, desde, hasta, cantidad, salto) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    subirArchivoPedidosYa: async (sucursal, rutaCSV) => {
        await apiClient.post(`${BASE}/${sucursal}/pedidosya`, null, {
            params: { rutaCSV },
        });
    },
    filtrar: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    obtenerDetalle: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, id, dto) => {
        await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
    },
    obtenerTotal: async (sucursal, desde, hasta) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data;
    },
    anular: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
};
