import dayjs from 'dayjs';
import { apiClient } from './client';
const BASE = '/R606';
function formatearFecha(d) {
    return d.format('YYYYMMDDHHmmss');
}
export const reporte606Api = {
    obtenerListado: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, {
            params: { desde: formatearFecha(desde), hasta: formatearFecha(hasta) },
        });
        return data.data;
    },
};
