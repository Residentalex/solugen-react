import { apiClient } from './client';
const BASE = '/Producto';
export const productoApi = {
    obtenerVista: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vista`, { params });
        return { items: data.data ?? [], total: data.total ?? 0 };
    },
    /** Obtener listado paginado */
    obtenerListado: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    /** Obtener total de productos (con filtros opcionales) */
    obtenerTotal: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: filtro });
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data.data;
    },
    obtenerDetalle: async (sucursal, codigo, signal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`, { signal });
        return data.data;
    },
    /** Obtener códigos de productos con vencimiento */
    obtenerProductosVencimiento: async (sucursal, codigos) => {
        const { data } = await apiClient.put(`${BASE}/productosVencimiento/${sucursal}`, codigos);
        return (data.data || []).map((p) => p.codigo);
    },
    descargarPlantilla: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla`, {
            responseType: 'blob',
        });
        return data;
    },
    descargarResultado: async (sucursal, productos) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/descargarResultado`, productos, { responseType: 'blob' });
        return data;
    },
    importarExcel: async (sucursal, file) => {
        const formData = new FormData();
        formData.append('archivo', file);
        const { data } = await apiClient.post(`${BASE}/${sucursal}/importar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.data;
    },
    obtenerComodines: async (sucursal) => {
        const { data } = await apiClient.get(`/Producto/comodines/${sucursal}`);
        if (Array.isArray(data))
            return data;
        return data.data || [];
    },
    /** Obtener productos por código de suplidor */
    obtenerProductosPorSuplidor: async (sucursal, codigoSuplidor, signal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/suplidor/${codigoSuplidor}`, { signal });
        return data.data;
    },
    /** Obtener productos por lista de códigos */
    obtenerPorListaCodigos: async (sucursal, codigos, datosExtra) => {
        const { data } = await apiClient.put(`${BASE}/codigos/${sucursal}`, codigos, { params: datosExtra !== undefined ? { datosExtra } : {} });
        return data.data;
    },
    /** Buscar productos por campo específico (codigo, referencia, equival) */
    buscarPorCampo: async (sucursal, campo, valor, cantidad = 10) => {
        const params = { campo, valor, cantidad };
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar`, { params });
        return data.data;
    },
    crear: async (sucursal, producto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, producto);
        return data.data;
    },
    actualizar: async (sucursal, producto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, producto);
        return data.data;
    },
};
