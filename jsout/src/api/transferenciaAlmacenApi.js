import { apiClient } from './client';
const BASE = '/TRP';
export const transferenciaAlmacenApi = {
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, estado) => {
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
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    filtrar: async (sucursal, filtro) => {
        const params = {};
        if (filtro.cantidad)
            params.cantidad = filtro.cantidad;
        if (filtro.salto)
            params.salto = filtro.salto;
        if (filtro.desde)
            params.desde = filtro.desde;
        if (filtro.hasta)
            params.hasta = filtro.hasta;
        if (filtro.documento)
            params.documento = filtro.documento;
        if (filtro.concepto)
            params.concepto = filtro.concepto;
        if (filtro.almacen)
            params.almacen = filtro.almacen;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, trp) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, trp);
        return data.data;
    },
    actualizar: async (sucursal, trp) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, trp);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    postear: async (sucursal, trp) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, trp);
        return data.data;
    },
    anular: async (sucursal, trp) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, trp);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
    },
    desaplicar: async (sucursal, documento) => {
        const { data } = await apiClient.put(`${BASE}/desaplicar`, null, {
            params: { origen: sucursal, documento }
        });
        return data.data;
    },
    revisado: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${id}/revisado`);
        return data.data;
    },
    reversar: async (sucursal, id) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/${id}/reversar`);
        return data.data;
    },
    verificarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/verificar`);
        return data.data;
    },
    descargarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
            responseType: 'blob',
        });
        return data;
    },
    // Catálogos para selects
    obtenerConceptos: async (sucursal, tipoDocumento) => {
        const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
        const params = {};
        const { data } = await apiClient.get(url, { params });
        return data.data;
    },
    obtenerAlmacenes: async (sucursal) => {
        const { data } = await apiClient.get(`/Almacen/${sucursal}`);
        return data.data;
    },
};
