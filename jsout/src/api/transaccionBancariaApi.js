import { apiClient } from './client';
const BASE = '/Transaccion';
export const transaccionBancariaApi = {
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    /** Crea un documento bancario vía POST /Transaccion/{sucursal}/DocBancario */
    crearDocBancario: async (sucursal, dto, postear = false) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/DocBancario`, dto, {
            params: { postear }
        });
        return data.data;
    },
    /** Actualiza una transacción vía PUT /Transaccion/{sucursal} */
    actualizar: async (sucursal, dto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, dto);
        if (!data.data)
            throw new Error('Error al actualizar transacción bancaria');
        return data.data;
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
        if (filtro.concepto)
            params.concepto = filtro.concepto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    anular: async (sucursal, dto, destino) => {
        const params = {};
        if (destino !== undefined)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, dto, { params });
        return data.data;
    },
    postear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, dto);
        return data.data;
    },
    desaplicar: async (origen, documento, destino) => {
        const params = { origen, documento };
        if (destino !== undefined)
            params.destino = destino;
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    /** Desaplica un documento bancario indicando la cuenta bancaria */
    desaplicarDocBancario: async (sucursal, documento, ctaBancaria, destino) => {
        const params = { documento, ctaBancaria };
        if (destino !== undefined)
            params.destino = destino;
        await apiClient.put(`${BASE}/${sucursal}/DocBancario/desaplicar`, null, { params });
    },
    // Scanner endpoints (existen en TransaccionController)
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
