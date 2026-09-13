import { apiClient } from './client';
const BASE = '/TUR';
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}000000`;
}
export const turnoApi = {
    obtenerListadoResumido: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return data.data;
    },
    filtrar: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data;
    },
    obtenerPorNoTurno: async (sucursal, noDoc) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/doc/${noDoc}`);
        return data.data;
    },
    postear: async (sucursal, noTurno, destino) => {
        const params = { noTurno, costos: true, ingresos: true };
        if (destino !== undefined)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/repostear`, null, { params });
        return data;
    },
};
export { formatDateParam };
