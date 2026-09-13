import { apiClient } from './client';
const getBase = (sucursal) => `/notificaciones/${sucursal}`;
const getBaseSQL = () => `/notificaciones/sql-config`;
export const notificacionesApi = {
    obtenerPendientes: async (sucursal, usuarioID) => {
        const { data } = await apiClient.get(`${getBase(sucursal)}/pendientes?usuarioID=${usuarioID}`);
        return data.data;
    },
    obtenerCantidadPendientes: async (sucursal, usuarioID) => {
        const { data } = await apiClient.get(`${getBase(sucursal)}/pendientes/cantidad?usuarioID=${usuarioID}`);
        return data.data;
    },
    marcarComoLeida: async (sucursal, id) => {
        await apiClient.put(`${getBase(sucursal)}/${id}/leer`);
    },
    enviar: async (sucursal, request) => {
        await apiClient.post(`${getBase(sucursal)}/enviar`, request);
    },
    obtenerEnviadas: async (sucursal, usuarioID) => {
        const { data } = await apiClient.get(`${getBase(sucursal)}/enviadas?usuarioID=${usuarioID}`);
        return data.data;
    },
    obtenerHistorial: async (sucursal, usuarioID) => {
        const { data } = await apiClient.get(`${getBase(sucursal)}/historial`, {
            params: { usuarioID }
        });
        return data.data;
    },
    obtenerConfig: async (sucursal) => {
        const { data } = await apiClient.get(`${getBase(sucursal)}/config`);
        return data.data;
    },
    guardarConfig: async (sucursal, config) => {
        await apiClient.post(`${getBase(sucursal)}/config`, config);
    },
    obtenerUsuarios: async () => {
        const { data } = await apiClient.get('/Usuario/Consolidado?activo=true');
        return data.data;
    },
    obtenerRoles: async () => {
        const { data } = await apiClient.get('/Rol/Consolidado');
        return data.data;
    },
    /* ── Notificaciones Personalizadas SQL ── */
    obtenerSQLConfigs: async () => {
        const { data } = await apiClient.get(`${getBaseSQL()}`);
        return data.data;
    },
    obtenerSQLConfig: async (id) => {
        const { data } = await apiClient.get(`${getBaseSQL()}/${id}`);
        return data.data;
    },
    crearSQLConfig: async (req) => {
        const { data } = await apiClient.post(`${getBaseSQL()}`, req);
        return data.data;
    },
    actualizarSQLConfig: async (id, req) => {
        await apiClient.put(`${getBaseSQL()}/${id}`, req);
    },
    eliminarSQLConfig: async (id) => {
        await apiClient.delete(`${getBaseSQL()}/${id}`);
    },
    probarSQLConfig: async (id) => {
        const { data } = await apiClient.post(`${getBaseSQL()}/${id}/probar`);
        return data.data;
    },
    activarSQLConfig: async (id, activo) => {
        await apiClient.post(`${getBaseSQL()}/${id}/activar`, { activo });
    },
    probarSQLDirecto: async (sql, limite) => {
        const { data } = await apiClient.post(`${getBaseSQL()}/probar-directo`, { sql, limite });
        return data.data;
    },
    ejecutarSQLConfig: async (configID, limite = 100) => {
        const { data } = await apiClient.post(`${getBaseSQL()}/${configID}/probar?limite=${limite}`);
        return data.data;
    },
};
