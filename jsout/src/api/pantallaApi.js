import { apiClient } from './client';
const BASE = '/Pantalla';
export const pantallaApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    filtrar: async (sucursal, filtro) => {
        const params = { ...filtro };
        const cleanParams = {};
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined)
            cleanParams[k] = v; });
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params: cleanParams });
        return data.data;
    },
    obtenerTotalPantallas: async (sucursal, params) => {
        const cleanParams = {};
        if (params)
            Object.entries(params).forEach(([k, v]) => { if (v !== undefined)
                cleanParams[k] = v; });
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params: cleanParams });
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, pantalla) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, pantalla);
        return data.data;
    },
    actualizar: async (sucursal, pantalla) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, pantalla);
        return data.data;
    },
    obtenerModulos: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/modulos`);
        return data.data;
    },
    obtenerAcciones: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/acciones`);
        return data.data;
    },
    obtenerEntidadesCatalogo: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/entidades-catalogo`);
        return data.data;
    },
    obtenerPantallasConEntidades: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/con-entidades`);
        return data.data;
    },
    asociarEntidades: async (sucursal, pantallaId, entidades) => {
        await apiClient.put(`${BASE}/${sucursal}/asociar-entidades`, { pantallaId, entidades });
    },
    eliminarEntidades: async (sucursal, pantallaId) => {
        await apiClient.delete(`${BASE}/${sucursal}/${pantallaId}/entidades`);
    },
};
