import { apiClient } from './client';
const BASE = '/Transaccion';
const TIPO_DOC = 'RDE';
export const facturaSuplidorApi = {
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, estado, documentCode = TIPO_DOC, tipoEntidad = 'SUP') => {
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
    filtrar: async (sucursal, filtro, documentCode = TIPO_DOC, tipoEntidad = 'SUP') => {
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
        const { data } = await apiClient.get(`/RDE/${sucursal}/${id}`);
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
    postear: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`/RDE/${sucursal}/postear`, transaccion);
        return data.data;
    },
    // ===== Catálogos para formulario =====
    obtenerTipos: async (sucursal) => {
        const { data } = await apiClient.get(`/Tipo/${sucursal}/documento/RDE`);
        return data.data;
    },
    obtenerConceptos: async (sucursal, tipoId) => {
        const { data } = await apiClient.get(`/Concepto/${sucursal}/documento/RDE`);
        return data.data;
    },
    obtenerSuplidores: async (sucursal) => {
        const { data } = await apiClient.get(`/Proveedor/${sucursal}?activo=true`);
        return data.data;
    },
    obtenerEntradasAlmacen: async (sucursal, params) => {
        const { entidad, ...restParams } = params || {};
        let url;
        if (entidad) {
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
    verificarNCF: async (sucursal, ncf, suplidorCodigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ncf?ncf=${encodeURIComponent(ncf)}&idEntidad=${encodeURIComponent(suplidorCodigo)}`);
        return data.data;
    },
    obtenerPorDocumento: async (sucursal, noDocumento) => {
        const { data } = await apiClient.get(`/RDE/${sucursal}/documento/${noDocumento}`);
        return data.data;
    },
    // ===== Scanner =====
    verificarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/${id}/scanner/verificar`);
        return data.data;
    },
    descargarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/${id}/scanner/descargar`, {
            responseType: 'blob',
        });
        return data;
    },
    generarAsientos: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`/RDE/${sucursal}/generarAsiento`, transaccion);
        return data.data;
    },
    // ===== Acciones de estado =====
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`/RDE/desaplicar`, null, { params });
    },
    revisado: async (sucursal, id) => {
        await apiClient.post(`/RDE/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`/RDE/${sucursal}/${id}/Reversar`);
    },
};
