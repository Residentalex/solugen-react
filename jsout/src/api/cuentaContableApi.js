import { apiClient } from './client';
const BASE = '/CuentaContable';
export const cuentaContableApi = {
    obtenerPorId: async (sucursal, noCuenta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${noCuenta}`);
        return (data && typeof data === 'object' && 'isSuccess' in data) ? data.data : data;
    },
    obtenerListado: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`);
        return data.data;
    },
    obtenerListadoPaginado: async (sucursal, cantidad = 25, salto = 0, filtro = '') => {
        const params = new URLSearchParams({ take: String(cantidad), skip: String(salto), filtro });
        const { data } = await apiClient.get(`${BASE}/${sucursal}?${params}`);
        return { data: data.data, total: data.total };
    },
    obtenerAuxiliares: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/Auxiliares`);
        return data.data;
    },
    obtenerMovimientos: async (sucursal, noCuenta, cantidad = 25, salto = 0, fechaCierre) => {
        let url = `${BASE}/${sucursal}/${noCuenta}/movimientos?cantidad=${cantidad}&salto=${salto}`;
        if (fechaCierre) {
            url += `&fechaCierre=${fechaCierre}`;
        }
        const { data } = await apiClient.get(url);
        return { data: data.data, total: data.total };
    },
    obtenerBalance: async (sucursal, noCuenta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${noCuenta}/balance`);
        return data.data;
    },
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    actualizar: async (sucursal, noCuenta, dto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/${noCuenta}`, dto);
        return data.data;
    },
    eliminar: async (sucursal, noCuenta) => {
        await apiClient.delete(`${BASE}/${sucursal}/${noCuenta}`);
    },
    // ===== Catálogos para formulario =====
    obtenerTipos: async (sucursal) => {
        const { data } = await apiClient.get(`/TipoCuenta/${sucursal}`);
        return data.data;
    },
    obtenerGrupos: async (sucursal) => {
        const { data } = await apiClient.get(`/GrupoCuentaContable/${sucursal}`);
        return data.data;
    },
};
