import { apiClient } from './client';
export const antiguedadSaldosDVCApi = {
    obtenerBalances: async (sucursal, hasta, codEntidad, codTipo, codSucursal) => {
        const params = new URLSearchParams();
        params.set('hasta', hasta);
        if (codEntidad)
            params.set('codEntidad', codEntidad);
        if (codTipo)
            params.set('codTipo', codTipo);
        if (codSucursal)
            params.set('codSucursal', codSucursal);
        const { data } = await apiClient.get(`/DVC/${sucursal}/balances?${params.toString()}`);
        return data.data;
    },
    generarPDF: async (sucursal, hasta, codEntidad, codTipo, codSucursal) => {
        const params = new URLSearchParams();
        params.set('hasta', hasta);
        if (codEntidad)
            params.set('codEntidad', codEntidad);
        if (codTipo)
            params.set('codTipo', codTipo);
        if (codSucursal)
            params.set('codSucursal', codSucursal);
        const { data } = await apiClient.get(`/reportes/antiguedad-saldos-dvc/${sucursal}?${params.toString()}`, { responseType: 'blob' });
        return data;
    },
    obtenerTipos: async (sucursal) => {
        const { data } = await apiClient.get(`/Tipo/${sucursal}/Documento/DVC`);
        return data.data;
    },
};
