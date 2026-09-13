import { apiClient } from './client';
export const horarioEmpleadoApi = {
    obtenerTodos: async (sucursal, sucursalFiltro, fechaInicio, fechaFin) => {
        const params = new URLSearchParams();
        if (sucursalFiltro !== undefined)
            params.append('sucursalFiltro', String(sucursalFiltro));
        if (fechaInicio)
            params.append('fechaInicio', fechaInicio);
        if (fechaFin)
            params.append('fechaFin', fechaFin);
        const query = params.toString();
        const url = `/Horario-empleado/${sucursal}${query ? `?${query}` : ''}`;
        const response = await apiClient.get(url);
        // El endpoint devuelve el array directamente (no envuelto en ApiResponse)
        const data = response.data || [];
        // Generar id sintético para rowKey del listado
        return data.map((item, index) => ({ ...item, id: index + 1 }));
    },
};
