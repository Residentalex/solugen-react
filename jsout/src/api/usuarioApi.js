import { apiClient } from './client';
const BASE = '/Usuario';
export const usuarioApi = {
    obtenerListado: async (sucursal, activo) => {
        const params = {};
        if (activo !== undefined)
            params.activo = activo;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    filtrar: async (sucursal, cuenta, nombre) => {
        const params = {};
        if (cuenta)
            params.cuenta = cuenta;
        if (nombre)
            params.nombre = nombre;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, usuario) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, usuario);
        return data.data;
    },
    actualizar: async (sucursal, usuario) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, usuario);
        return data.data;
    },
    resetearPassword: async (sucursal, id) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/${id}/resetear-password`);
        return data.data;
    },
    cambiarEstado: async (sucursal, id, activo) => {
        await apiClient.put(`${BASE}/${sucursal}/${id}/estado`, { activo });
    },
    obtenerPantallasPorRoles: async (sucursal, roleIds) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/pantallas-por-roles`, roleIds);
        if (Array.isArray(data))
            return data;
        if (data?.data && Array.isArray(data.data))
            return data.data;
        return [];
    },
};
