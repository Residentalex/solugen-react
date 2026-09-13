import { apiClient } from './client';
const BASE = '/CierreMes';
export const cierreMesApi = {
    /** Obtiene listado de sucursales activas con su fecha de último cierre */
    obtenerListado: async () => {
        const { data } = await apiClient.get(BASE);
        return data.data ?? [];
    },
    /** Actualiza la fecha de cierre de una sucursal */
    actualizarFecha: async (sucursal, fecha) => {
        await apiClient.put(`${BASE}/${sucursal}`, null, {
            params: { fecha },
        });
    },
};
