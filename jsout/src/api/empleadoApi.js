import { apiClient } from './client';
export const empleadoApi = {
    obtenerTodos: async (sucursal) => {
        const { data } = await apiClient.get(`/Empleado/${sucursal}`);
        return data.data || [];
    },
    obtenerPaginado: async (sucursal, cantidad, salto) => {
        const params = {};
        if (cantidad !== undefined)
            params.cantidad = cantidad;
        if (salto !== undefined)
            params.salto = salto;
        const { data } = await apiClient.get(`/Empleado/${sucursal}`, { params });
        return data.data || [];
    },
    obtenerListado: async (sucursal, busqueda, cantidad, salto) => {
        const params = { cantidad, salto };
        if (busqueda)
            params.busqueda = busqueda;
        const { data } = await apiClient.get(`/Empleado/${sucursal}/listado`, { params });
        return { datos: data.data || [], total: data.total || 0 };
    },
    obtenerPorCodigo: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`/Empleado/${sucursal}/${codigo}`);
        return data?.data || data;
    },
    crear: async (sucursal, empleado) => {
        const { data } = await apiClient.post(`/Empleado/${sucursal}`, empleado);
        return data.data;
    },
    actualizar: async (sucursal, codigo, empleado) => {
        const { data } = await apiClient.put(`/Empleado/${sucursal}/${codigo}`, empleado);
        return data.data;
    },
};
