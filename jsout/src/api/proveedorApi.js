import { apiClient } from './client';
const BASE = '/Proveedor';
export const proveedorApi = {
    obtenerListado: async (sucursal, cantidad, salto) => {
        const params = {};
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        const { data } = await apiClient.get(`${BASE}/${sucursal}?activo=true`, { params });
        return data.data;
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${codigo}`);
        return data;
    },
    filtrar: async (sucursal, codigo, suplidor) => {
        const params = {};
        if (codigo)
            params.codigo = codigo;
        if (suplidor)
            params.suplidor = suplidor;
        params.activo = 'true';
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    obtenerLibresORC: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/noOrc`);
        return data.data;
    },
};
