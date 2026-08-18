import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export const documentoImpresionApi = {
  marcarImpreso: (modulo: string, sucursal: number, id: number) =>
    apiClient.put<ApiResponse<unknown>>(`/${modulo}/${sucursal}/imprimir/${id}`),
};
