import { apiClient } from './client';
const BASE = '/Tipo';
export const tipoApi = {
    /** Obtener tipos de documento por código de documento */
    obtenerPorDocumento: async (sucursal, documento) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/Documento/${documento}`);
        return data.data || [];
    },
    /** Obtener todos los tipos de documento */
    obtenerTodo: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data || [];
    },
    obtenerPorCodigo: async (sucursal, documento, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/Documento/${documento}`);
        const tipos = data?.data || [];
        return tipos.find((t) => t.codigo === codigo) || null;
    },
};
