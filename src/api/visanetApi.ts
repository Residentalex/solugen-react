import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { VisanetResponseDTO, VisanetVoucherDTO } from '../types/visanet';

const BASE = '/visanet';

export const visanetApi = {
  vender: async (sucursal: number, transacId: number, monto: number, tokenECR?: string): Promise<VisanetResponseDTO> => {
    const { data } = await apiClient.post<ApiResponse<VisanetResponseDTO>>(`${BASE}/${sucursal}/vender`, { transacId, monto, ...(tokenECR ? { tokenECR } : {}) });
    return data.data;
  },

  venderSubsidio: async (sucursal: number, transacId: number, monto: number, subsidyId: string): Promise<VisanetResponseDTO> => {
    const { data } = await apiClient.post<ApiResponse<VisanetResponseDTO>>(`${BASE}/${sucursal}/vender-subsidio`, { transacId, monto, subsidyId });
    return data.data;
  },

  anular: async (sucursal: number, tokenId: string): Promise<VisanetResponseDTO> => {
    const { data } = await apiClient.post<ApiResponse<VisanetResponseDTO>>(`${BASE}/${sucursal}/anular`, { tokenId });
    return data.data;
  },

  cerrarLote: async (sucursal: number, ipTerminal?: string, puertoTerminal?: number): Promise<string> => {
    const { data } = await apiClient.post<ApiResponse<string>>(`${BASE}/${sucursal}/cerrar-lote`, {
      ...(ipTerminal ? { ipTerminal } : {}),
      ...(puertoTerminal ? { puertoTerminal } : {}),
    });
    return data.data;
  },

  obtenerVouchersDelDia: async (sucursal: number): Promise<VisanetVoucherDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<VisanetVoucherDTO[]>>(`${BASE}/${sucursal}/vouchers-dia`);
    return data.data;
  },
};
