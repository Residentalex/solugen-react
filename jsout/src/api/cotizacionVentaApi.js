import { apiClient } from './client';
const BASE = '/COTV';
export const cotizacionVentaApi = {
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
        if (filtro.cliente)
            params.cliente = filtro.cliente;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    // ═══ Carga progresiva: encabezado ligero + secciones on-demand ═══
    obtenerEncabezado: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/encabezado`);
        return data.data;
    },
    obtenerDetalles: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/detalles`);
        return data.data || [];
    },
    obtenerAsientos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/asientos`);
        return data.data || [];
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    postear: async (sucursal, cotizacion, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, cotizacion, { params });
        return data.data;
    },
    crear: async (sucursal, cotizacion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, cotizacion);
        return data.data;
    },
    actualizar: async (sucursal, id, cotizacion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${id}`, cotizacion);
        return data.data;
    },
    anular: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/anular/${id}`);
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    revisado: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
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
};
