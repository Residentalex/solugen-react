import { apiClient } from './client';
const BASE = '/Integridad';
export const integridadApi = {
    /** Obtener reporte de integridad de auxiliares */
    obtenerAuxiliares: async (sucursal, desde, hasta, tipoDoc, sucursalId) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        if (sucursalId !== undefined && sucursalId !== '')
            params.sucursalId = sucursalId;
        const { data } = await apiClient.get(`${BASE}/auxiliares/${sucursal}`, { params });
        return data.data || [];
    },
    /** Corregir sucursal de documentos seleccionados */
    corregirSucursal: async (items) => {
        const { data } = await apiClient.put(`${BASE}/auxiliares/corregir-sucursal`, { items });
        return data.data || { exitos: 0, errores: 0, mensajesError: [] };
    },
};
