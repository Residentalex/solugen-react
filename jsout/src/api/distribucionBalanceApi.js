import { apiClient } from './client';
const BASE = '/Transaccion';
const TIPO_DOC = 'DBA';
export const distribucionBalanceApi = {
    obtenerVista: async (sucursal, tipoEntidad, desde, hasta, cantidad, salto, estado, documentCode = TIPO_DOC) => {
        const params = { TipoEntidad: tipoEntidad };
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
        const { data } = await apiClient.get(`${BASE}/${sucursal}/tipo/${documentCode}`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    filtrar: async (sucursal, tipoEntidad, filtro, documentCode = TIPO_DOC) => {
        const params = { tipoEntidad };
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
        if (filtro.nCF)
            params.nCF = filtro.nCF;
        if (filtro.concepto)
            params.concepto = filtro.concepto;
        if (filtro.entidad)
            params.entidad = filtro.entidad;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/tipo/${documentCode}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, transaccion);
        return data.data;
    },
    actualizar: async (sucursal, transaccion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, transaccion);
        return data.data;
    },
    anular: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, transaccion);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (origen, documento, destino) => {
        const params = { origen, documento };
        if (destino !== undefined)
            params.destino = destino;
        const { data } = await apiClient.put(`${BASE}/desaplicar`, null, { params });
        return data.data;
    },
    postear: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, transaccion);
        return data.data;
    },
    recalcular: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/recalcularPagos/${id}`);
        return data.data;
    },
    generarAsientos: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generarAsiento`, transaccion);
        return data.data;
    },
    revisado: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/revisado/${id}`);
        return data.data;
    },
    reversar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/reversar/${id}`);
        return data.data;
    },
};
