import { apiClient } from './client';
const BASE = '/PermisoEspecial';
export const permisoEspecialApi = {
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    crear: async (sucursal, permiso) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, permiso);
        return data.data;
    },
    actualizar: async (sucursal, permiso) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, permiso);
        return data.data;
    },
    obtenerPorPantalla: async (sucursal, pantallaId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/por-pantalla/${pantallaId}`);
        return data.data;
    },
    asignarAPantalla: async (sucursal, pantallaId, permisoIds) => {
        await apiClient.put(`${BASE}/${sucursal}/asignar-pantalla`, { pantallaId, permisoIds });
    },
    obtenerPorRol: async (sucursal, rolId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/por-rol/${rolId}`);
        return data.data;
    },
    asignarARol: async (sucursal, rolId, pantallaId, permisos) => {
        await apiClient.put(`${BASE}/${sucursal}/asignar-rol`, { rolId, pantallaId, permisos });
    },
};
