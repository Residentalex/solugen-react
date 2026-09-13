import { apiClient } from './client';
const ENTIDADES_BASE = '/Entidad';
export const entidadApi = {
    obtenerEntidades: async (sucursal, conceptoCodigo, activo, tipo) => {
        const params = {};
        if (conceptoCodigo)
            params.concepto = conceptoCodigo;
        if (activo !== undefined)
            params.activo = String(activo);
        if (tipo)
            params.tipo = tipo;
        const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}`, { params });
        return data.data;
    },
    obtenerActivos: async (sucursal, conceptoCodigo, tipo) => {
        const params = {};
        if (conceptoCodigo)
            params.concepto = conceptoCodigo;
        if (tipo)
            params.tipo = tipo;
        const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}/Activos`, { params });
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo, tipoEntidad) => {
        const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}/${codigo}`, { params: { tipoEntidad } });
        return data.data;
    },
    buscar: async (sucursal, valor, cantidad) => {
        const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}/buscar`, { params: { valor, cantidad } });
        return data.data;
    },
    buscarTipos: async (sucursal, busqueda) => {
        const { data } = await apiClient.get(`${ENTIDADES_BASE}/${sucursal}/tipos`, { params: { busqueda } });
        return data.data;
    },
};
export default entidadApi;
