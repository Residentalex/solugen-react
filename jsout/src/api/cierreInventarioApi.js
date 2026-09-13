import { apiClient } from './client';
export const cierreInventarioApi = {
    /** Obtiene la fecha del último cierre de inventario */
    obtenerFechaCierre: async (sucursal) => {
        const { data } = await apiClient.get(`/Parametros/${sucursal}/FechaCierreINV`);
        return data;
    },
    /** Genera el cierre de inventario completo (todo se procesa en backend) */
    generarCierre: async (sucursal, fecha) => {
        const { data } = await apiClient.post(`/Existencia/${sucursal}/generar-cierre?fecha=${fecha}`);
        return data.data;
    },
    /** Obtiene los cierres históricos de inventario */
    obtenerCierres: async (sucursal) => {
        const { data } = await apiClient.get(`/cierre/${sucursal}/porFecha`);
        return data;
    },
    /** Obtiene el detalle de productos de un cierre específico */
    obtenerDetalleCierre: async (sucursal, cierreId) => {
        const { data } = await apiClient.get(`/cierre/${sucursal}/detalle/${cierreId}`);
        return data;
    },
    /** Obtiene productos con existencia negativa que bloquean el cierre */
    obtenerExistenciasNegativas: async (sucursal) => {
        const { data } = await apiClient.get(`/Existencia/${sucursal}/existencias-negativas`);
        return data;
    },
    /** Reapertura un periodo cerrado */
    reaperturar: async (sucursal, fechaNueva, fechaAnterior, razon, codigoUsuario) => {
        await apiClient.put(`/cierre/${sucursal}/reaperturar`, { fechaNueva, fechaAnterior, razon, codigoUsuario });
    },
};
