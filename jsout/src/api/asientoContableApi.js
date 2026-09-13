import { apiClient } from './client';
const BASE = '/Transaccion';
export const asientoContableApi = {
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, estado, tipoDoc) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        if (estado !== undefined)
            params.estado = estado;
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/conAsientos/vista`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    filtrarConAsientos: async (sucursal, params, tipoDoc) => {
        const allParams = { ...params };
        if (tipoDoc)
            allParams.tipoDoc = tipoDoc;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/conAsientos/filtrar`, { params: allParams });
        return { data: data.data || [], total: data.total ?? 0 };
    },
};
