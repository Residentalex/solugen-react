import { apiClient } from './client';
const CONCEPTOS_BASE = '/Concepto';
const PROVEEDORES_BASE = '/Proveedor';
const ALMACENES_BASE = '/Almacen';
export const conceptosApi = {
    obtenerConceptos: async (sucursal, filtro) => {
        const params = {};
        if (filtro)
            params.filtro = filtro;
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}`, { params });
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/filtrar`, { params: filtro });
        return data.data;
    },
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/total/${sucursal}`, { params });
        return data.data;
    },
    obtenerConceptosPorDocumento: async (sucursal, documento, filtro) => {
        const params = {};
        if (filtro)
            params.filtro = filtro;
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/documento/${documento}`, { params });
        return data.data;
    },
    obtenerConcepto: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
    obtenerEntidades: async (sucursal, conceptoCodigo, activo, tipo) => {
        const params = {};
        if (conceptoCodigo)
            params.concepto = conceptoCodigo;
        if (activo !== undefined)
            params.activo = String(activo);
        if (tipo)
            params.tipo = tipo;
        const { data } = await apiClient.get(`/Entidad/${sucursal}`, { params });
        return data.data;
    },
    obtenerEntidadesActivas: async (sucursal, conceptoCodigo, tipo) => {
        const params = {};
        if (conceptoCodigo)
            params.concepto = conceptoCodigo;
        if (tipo)
            params.tipo = tipo;
        const { data } = await apiClient.get(`/Entidad/${sucursal}/Activos`, { params });
        return data.data;
    },
    obtenerSuplidores: async (sucursal) => {
        const { data } = await apiClient.get(`${PROVEEDORES_BASE}/${sucursal}?activo=true`);
        return data.data;
    },
    obtenerAlmacenes: async (sucursal) => {
        const { data } = await apiClient.get(`${ALMACENES_BASE}/${sucursal}`);
        return data.data;
    },
    obtenerSucursales: async (sucursal) => {
        const { data } = await apiClient.get(`/Compania/todas/${sucursal}`);
        return data;
    },
    obtenerConceptosPorDocumentoTipo: async (sucursal, documento, tipo, tipoEntidad) => {
        const params = { documento };
        if (tipo)
            params.tipo = tipo;
        if (tipoEntidad)
            params.tipoEntidad = tipoEntidad;
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/documentoporTipo`, { params });
        return data.data;
    },
    obtenerConceptosPorSucursalDestino: async (sucursal, codSucDest) => {
        const { data } = await apiClient.get(`${CONCEPTOS_BASE}/${sucursal}/porSucursalDestino/${codSucDest}`);
        return data.data;
    },
    actualizarConcepto: async (sucursal, codigo, dto) => {
        const { data } = await apiClient.put(`${CONCEPTOS_BASE}/${sucursal}/${codigo}`, dto);
        return data.data;
    },
    crearConcepto: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${CONCEPTOS_BASE}/${sucursal}`, dto);
        return data.data;
    },
};
