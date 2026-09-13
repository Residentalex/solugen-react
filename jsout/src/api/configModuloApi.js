import { apiClient } from './client';
const BASE = '/ConfigModulo';
export const configModuloApi = {
    obtenerPorModulo: async (sucursal, modulo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${modulo}`);
        const result = {};
        (data.data || []).forEach((cfg) => {
            result[cfg.clave] = cfg.valor;
        });
        return result;
    },
    obtenerListaCompleta: async (sucursal, modulo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${modulo}`);
        return data.data || [];
    },
    obtenerPorClave: async (sucursal, modulo, clave) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${modulo}/${clave}`);
        return data.data ?? null;
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, modulo, clave, dto) => {
        await apiClient.put(`${BASE}/${sucursal}/${modulo}/${clave}`, dto);
    },
    eliminar: async (sucursal, modulo, clave) => {
        await apiClient.delete(`${BASE}/${sucursal}/${modulo}/${clave}`);
    },
};
