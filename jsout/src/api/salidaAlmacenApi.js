import { apiClient } from './client';
const BASE = '/SAP';
export const salidaAlmacenApi = {
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
        if (filtro.suplidor)
            params.suplidor = filtro.suplidor;
        if (filtro.almacen)
            params.almacen = filtro.almacen;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, salida) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, salida);
        return data.data;
    },
    actualizar: async (sucursal, salida) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, salida);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (sucursal, documento) => {
        const { data } = await apiClient.put(`${BASE}/desaplicar`, null, {
            params: { origen: sucursal, documento }
        });
        return data.data;
    },
    postear: async (sucursal, salida) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, salida);
        return data.data;
    },
    anular: async (sucursal, salida) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, salida);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
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
    obtenerTransferencias: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/Transferencias?desde=${desde}&hasta=${hasta}`);
        return data.data;
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
    obtenerSuplidores: async (sucursal) => {
        const { data } = await apiClient.get(`/Proveedor/${sucursal}?activo=true`);
        return data.data;
    },
};
