import { apiClient } from './client';
const BASE = '/reportes/config';
export const reportesConfigApi = {
    /** Lista de plantillas disponibles (sin el JSON completo). */
    obtenerListado: async () => {
        const { data } = await apiClient.get(BASE);
        return data.data || [];
    },
    /** Detalle de una plantilla por id (incluye config como objeto o null). */
    obtenerPorId: async (plantillaId) => {
        const { data } = await apiClient.get(`${BASE}/${plantillaId}`);
        return data.data;
    },
    /** Detalle de una plantilla por codigo (ej: FPV_TICKET, FRI_TICKET). */
    obtenerPorCodigo: async (codigo) => {
        const { data } = await apiClient.get(`${BASE}/codigo/${codigo}`);
        return data.data;
    },
    /**
     * Actualiza la config de una plantilla.
     * `config` null resetea a NULL en BD (vuelve al predeterminado).
     */
    actualizarConfig: async (plantillaId, config) => {
        const { data } = await apiClient.put(`${BASE}/${plantillaId}`, { config });
        return data.data;
    },
    /** Crea una nueva plantilla (codigo, nombre, tipo). */
    crear: async (request) => {
        const { data } = await apiClient.post(BASE, request);
        return data.data;
    },
    /** Activa o desactiva una plantilla. */
    actualizarActivo: async (plantillaId, activo) => {
        await apiClient.patch(`${BASE}/${plantillaId}/activo`, activo, {
            headers: { 'Content-Type': 'application/json' },
        });
    },
    /** Obtiene la plantilla ESC/POS asociada a un tipo de documento (ENTDOC). */
    obtenerPorEntdoc: async (entdocCodigo) => {
        const { data } = await apiClient.get(`${BASE}/por-entdoc/${entdocCodigo}`);
        return data.data;
    },
    /** Asigna (o desasigna con null) una plantilla a un tipo de documento (ENTDOC). */
    asignarEntdoc: async (entdocCodigo, plantillaId) => {
        await apiClient.put(`${BASE}/asignar-entdoc`, {
            entdocCodigo,
            plantillaId,
        });
    },
};
