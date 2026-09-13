import { apiClient } from './client';
// ============================================================
// API Client
// ============================================================
const BASE = 'CierreFiscal';
export const cierreFiscalApi = {
    listarCierres: async () => {
        const { data } = await apiClient.get(`${BASE}/Listar`);
        return data.data ?? [];
    },
    obtenerResultadosPorCierre: async (sucursal, transacId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/Resultados`, {
            params: { transacId }
        });
        return data.data ?? [];
    },
};
