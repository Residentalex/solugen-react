import { apiClient } from './client';
const BASE = '/ActualizacionCosto';
export const actualizacionCostoApi = {
    obtenerPendientes: async (sucursal, desde, hasta, docs) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params: { desde, hasta, docs } });
        return data.data;
    },
    aplicar: async (sucursal, payload) => {
        await apiClient.put(`${BASE}/${sucursal}/CrearActualizacionCosto`, payload);
    },
};
