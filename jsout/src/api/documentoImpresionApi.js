import { apiClient } from './client';
export const documentoImpresionApi = {
    marcarImpreso: (modulo, sucursal, id) => apiClient.put(`/${modulo}/${sucursal}/imprimir/${id}`),
};
