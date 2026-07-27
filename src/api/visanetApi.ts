import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { VisanetResponseDTO } from '../types/visanet';

const BASE = '/visanet';

export const visanetApi = {
  vender: async (sucursal: number, transacId: number, monto: number): Promise<VisanetResponseDTO> => {
    const { data } = await apiClient.post<ApiResponse<VisanetResponseDTO>>(`${BASE}/${sucursal}/vender`, { transacId, monto });
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

  cerrarLote: async (sucursal: number): Promise<string> => {
    const { data } = await apiClient.post<ApiResponse<string>>(`${BASE}/${sucursal}/cerrar-lote`);
    return data.data;
  },
};
