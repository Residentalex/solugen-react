import { apiClient } from './client';
export const importarInventarioApi = {
    /** Obtener conceptos según tipo de documento */
    obtenerConceptos: async (sucursal, tipoDocumento) => {
        const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
        const params = {};
        const { data } = await apiClient.get(url, { params });
        return data.data;
    },
    obtenerAlmacenes: async (sucursal) => {
        const { data } = await apiClient.get(`/Almacen/${sucursal}`);
        return data.data;
    },
    obtenerSuplidores: async (sucursal) => {
        const { data } = await apiClient.get(`/Proveedor/${sucursal}?activo=true`);
        return data.data;
    },
};
