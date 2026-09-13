import { apiClient } from './client';
const BASE = '/Parametros';
export const parametrosApi = {
    obtenerFechaCierre: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/FechaCierre`);
        return data.data;
    },
    obtenerFechaCierreFiscal: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/FechaCierreFiscal`);
        return data.data;
    },
    obtenerFechaCierreInventario: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/FechaCierreINV`);
        return data;
    },
    obtenerSucursalContable: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/sucursal-contable`);
        if (!data.isSuccess)
            throw new Error(data.errorMessage || 'Error al obtener sucursal contable');
        return data.data ?? null;
    },
    obtenerParametrosAjuste: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ajuste`);
        return data.data;
    },
};
