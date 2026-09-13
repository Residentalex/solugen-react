import { apiClient } from './client';
const BASE = '/DVC';
export const devolucionCompraApi = {
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
        if (filtro.entidad)
            params.entidad = filtro.entidad;
        if (filtro.referencia)
            params.referencia = filtro.referencia;
        if (filtro.almacen)
            params.almacen = filtro.almacen;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    obtenerPorNoDocumento: async (sucursal, noDoc) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/noDoc/${noDoc}`);
        return data.data;
    },
    crear: async (sucursal, devolucion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, devolucion);
        return data.data;
    },
    actualizar: async (sucursal, devolucion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, devolucion);
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
    postear: async (sucursal, devolucion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, devolucion);
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
    anular: async (sucursal, devolucion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, devolucion);
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
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
    // ===== Catálogos para formulario =====
    obtenerTipos: async (sucursal) => {
        const { data } = await apiClient.get(`/Tipo/${sucursal}/documento/DVC`);
        return data.data;
    },
    obtenerConceptos: async (sucursal, tipoId) => {
        const { data } = await apiClient.get(`/Concepto/${sucursal}/documento/DVC`);
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
    obtenerTipoDVCDefecto: async (sucursal) => {
        const { data } = await apiClient.get(`/Tipo/${sucursal}/DVCDefecto`);
        return data.data;
    },
    buscarEntradas: async (sucursal, params) => {
        const { entidad, texto, ...restParams } = params || {};
        let url;
        if (texto) {
            url = `/ENP/${sucursal}/filtrar`;
            restParams.documento = texto;
            if (entidad)
                restParams.entidad = entidad;
        }
        else if (entidad) {
            url = `/ENP/${sucursal}/PorSuplidor`;
            restParams.codigoEntidad = entidad;
        }
        else {
            url = `/ENP/${sucursal}`;
        }
        const { data } = await apiClient.get(url, { params: restParams });
        return data.data;
    },
    obtenerDetalleEntrada: async (sucursal, id) => {
        const { data } = await apiClient.get(`/ENP/${sucursal}/${id}`);
        return data.data;
    },
    obtenerPorIdEntrada: async (sucursal, idEntrada) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/idEntrada/${idEntrada}`);
        return data.data;
    },
};
