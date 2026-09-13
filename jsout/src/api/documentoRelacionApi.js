import { apiClient } from './client';
export const documentoRelacionApi = {
    obtenerPorTransaccion: async (idTransaccion, sucursal) => {
        const params = sucursal !== undefined ? { sucursal } : {};
        const { data } = await apiClient.get(`/DocumentoRelacion/${idTransaccion}`, { params });
        return data.data;
    },
};
