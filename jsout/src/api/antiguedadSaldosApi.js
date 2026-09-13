import { apiClient } from './client';
export const antiguedadSaldosApi = {
    obtenerBalances: async (sucursal, tipoEntidad, hasta, codEntidad, codCategoria, codSucursal) => {
        const params = new URLSearchParams();
        params.set('hasta', hasta);
        if (codEntidad)
            params.set('codEntidad', codEntidad);
        if (codCategoria)
            params.set('codCategoria', codCategoria);
        if (codSucursal)
            params.set('codSucursal', codSucursal);
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/${tipoEntidad}/balances?${params.toString()}`);
        return data.data;
    },
    generarPDF: async (sucursal, tipoEntidad, payload) => {
        const { data } = await apiClient.post(`/reportes/antiguedad-saldos/${sucursal}/${tipoEntidad}`, payload, { responseType: 'blob' });
        return data;
    },
    obtenerCategorias: async (sucursal, tipo) => {
        const { data } = await apiClient.get(`/categoriaentidad/${sucursal}/tipo/${tipo}`);
        return data.data;
    },
};
