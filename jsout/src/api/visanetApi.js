import { apiClient } from './client';
const BASE = '/visanet';
export const visanetApi = {
    vender: async (sucursal, transacId, monto, tokenECR) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/vender`, { transacId, monto, ...(tokenECR ? { tokenECR } : {}) });
        return data.data;
    },
    venderSubsidio: async (sucursal, transacId, monto, subsidyId) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/vender-subsidio`, { transacId, monto, subsidyId });
        return data.data;
    },
    anular: async (sucursal, tokenId) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, { tokenId });
        return data.data;
    },
    cerrarLote: async (sucursal, ipTerminal, puertoTerminal) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/cerrar-lote`, {
            ...(ipTerminal ? { ipTerminal } : {}),
            ...(puertoTerminal ? { puertoTerminal } : {}),
        });
        return data.data;
    },
    obtenerVouchersDelDia: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/vouchers-dia`);
        return data.data;
    },
};
