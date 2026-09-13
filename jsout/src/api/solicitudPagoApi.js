import { apiClient } from './client';
const BASE = '/SPA';
export const solicitudPagoApi = {
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        if (!data.data)
            throw new Error('Error al crear solicitud de pago');
        return data.data;
    },
    actualizar: async (sucursal, dto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, dto);
        if (!data.data)
            throw new Error('Error al actualizar solicitud de pago');
        return data.data;
    },
    obtenerResumido: async (sucursal, desde, hasta, cantidad, salto, estado) => {
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
        if (filtro.cantidad !== undefined)
            params.cantidad = filtro.cantidad;
        if (filtro.salto !== undefined)
            params.salto = filtro.salto;
        if (filtro.desde)
            params.desde = filtro.desde;
        if (filtro.hasta)
            params.hasta = filtro.hasta;
        if (filtro.documento)
            params.documento = filtro.documento;
        if (filtro.entidad)
            params.entidad = filtro.entidad;
        if (filtro.beneficiario)
            params.beneficiario = filtro.beneficiario;
        if (filtro.ctaBancaria)
            params.ctaBancaria = filtro.ctaBancaria;
        if (filtro.concepto)
            params.concepto = filtro.concepto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vista/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, estado) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad !== undefined)
            params.cantidad = cantidad;
        if (salto !== undefined)
            params.salto = salto;
        if (estado !== undefined)
            params.estado = estado;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vista`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
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
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    anular: async (sucursal, spa) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, spa);
        return data.data;
    },
    postear: async (sucursal, spa, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, spa, { params });
        return data.data;
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
    generarPago: async (sucursal, id, postear) => {
        const params = {};
        if (postear)
            params.postear = true;
        const { data } = await apiClient.post(`/SPA/${sucursal}/generar-pago/${id}`, null, { params });
        return data.data;
    },
    generarAsientos: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`/SPA/${sucursal}/generarAsiento`, transaccion);
        return data.data;
    },
};
