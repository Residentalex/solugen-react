import { apiClient } from './client';
const BASE = '/Transaccion';
function formatDateParam(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
}
export const transaccionApi = {
    /** Obtener transacción por ID */
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    /** Obtener transacciones con asientos no cuadrados */
    obtenerNoCuadrados: async (sucursal, desde, hasta, tipoDoc) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/asientosnoCuadrado`, { params });
        return data.data || [];
    },
    /** Obtener transacciones con cuentas inválidas (inexistentes o de control) */
    obtenerCuentasInvalidas: async (sucursal, desde, hasta, tipoDoc) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/asientosintegridad`, { params });
        return data.data || [];
    },
    /** Obtener transacciones anuladas (paginado) */
    obtenerAnulados: async (sucursal, desde, hasta, tipoDoc, moduloDocs, page = 1, pageSize = 25) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        if (moduloDocs)
            params.moduloDocs = moduloDocs;
        params.cantidad = String(pageSize);
        params.salto = String((page - 1) * pageSize);
        const { data } = await apiClient.get(`${BASE}/${sucursal}/anulados`, { params });
        return data.data || { data: [], total: 0 };
    },
    /** Postear una transacción individual */
    postear: async (sucursal, transaccion, destino) => {
        const params = {};
        if (destino !== undefined)
            params.destino = String(destino);
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, transaccion, { params });
        return data.data;
    },
    /** Postear documentos bancarios */
    postearDocBancario: async (sucursal, desde, hasta, tipoDoc, ctaBanc) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        if (ctaBanc)
            params.ctaBanc = ctaBanc;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/DocBancario/postear`, null, { params });
        return data.data || [];
    },
    /** Filtrar transacciones */
    filtrar: async (sucursal, filtro) => {
        const params = {};
        if (filtro.cantidad)
            params.cantidad = filtro.cantidad;
        if (filtro.salto)
            params.salto = filtro.salto;
        if (filtro.desde)
            params.desde = filtro.desde;
        if (filtro.hasta)
            params.hasta = filtro.hasta;
        if (filtro.documento)
            params.documento = filtro.documento;
        if (filtro.nCF)
            params.nCF = filtro.nCF;
        if (filtro.concepto)
            params.concepto = filtro.concepto;
        if (filtro.entidad)
            params.entidad = filtro.entidad;
        if (filtro.tipoEntidad)
            params.tipoEntidad = filtro.tipoEntidad;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return data.data || [];
    },
    /** Obtener transacciones por tipo y rango de fecha */
    obtenerPorRangoFecha: async (sucursal, tipoDoc, desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${tipoDoc}/RangoFecha`, { params: { desde, hasta } });
        return data.data || [];
    },
    /** Obtener transacciones por tipo de documento (vista resumida) */
    obtenerResumidoPorTipo: async (sucursal, tipoDoc, desde, hasta, tipoEntidad) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (tipoEntidad)
            params.TipoEntidad = tipoEntidad;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/tipo/${tipoDoc}`, { params });
        return data.data || [];
    },
    /** Buscar transacciones por campo específico (documento, ncf, doc_ref) */
    buscarPorCampo: async (sucursal, campo, valor, cantidad = 10, tipoDoc) => {
        const params = { campo, valor, cantidad };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar`, { params });
        return data.data;
    },
    /** Obtener transacciones asociadas de inventario (pagos) */
    obtenerAsociadasInventario: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/asociadasINV/${id}`);
        return data.data || [];
    },
    /** Obtener transacciones asociadas desde DOCASOC */
    obtenerAsociadas: async (sucursal, id, origen, todas) => {
        const params = {};
        if (origen)
            params.origen = origen;
        if (todas)
            params.todas = 'true';
        const { data } = await apiClient.get(`${BASE}/${sucursal}/asociadas/${id}`, { params });
        return data.data || [];
    },
    /** Obtener documentos que consumieron a un documento (sin filtro EXCREPSA) */
    contarPosteable: async (sucursal, tipoDoc, desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/total-posteable/${tipoDoc}`, {
            params: { desde, hasta }
        });
        return data.data ?? 0;
    },
    obtenerConsumidores: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/consumidores/${id}`);
        return data.data || [];
    },
    /** Obtener documentos que fueron consumidos por un documento (sin filtro EXCREPSA) */
    obtenerConsumidos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/consumidos/${id}`);
        return data.data || [];
    },
    /** Obtener devoluciones (DEV) vinculadas a un PV via DTRANSIDASOC */
    obtenerDevolucionesPorPV: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/devolucionesPV/${id}`);
        return data.data || [];
    },
    /** Crear una nueva transaccion */
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    /** Actualizar una transaccion existente */
    actualizar: async (sucursal, dto) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, dto);
        return data.data;
    },
    /** Aplicar un documento por ID */
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    /** Desaplicar un documento */
    desaplicar: async (sucursal, documento) => {
        await apiClient.put(`${BASE}/desaplicar?origen=${sucursal}&documento=${encodeURIComponent(documento)}`);
    },
    /** Anular un documento */
    anular: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, transaccion);
        return data.data;
    },
    /** Generar asientos contables para un documento */
    generarAsientos: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generarAsiento`, transaccion);
        return data.data ?? [];
    },
    /** Obtener documentos registrados que deberian tener asientos pero no tienen */
    obtenerDocumentosSinAsiento: async (sucursal, desde, hasta, tipoDoc, modulo, sucursalId) => {
        const params = { desde, hasta };
        if (tipoDoc)
            params.tipoDoc = tipoDoc;
        if (modulo !== undefined)
            params.modulo = String(modulo);
        if (sucursalId)
            params.sucursalId = sucursalId;
        const { data } = await apiClient.get(`/Integridad/documentos-sin-asiento/${sucursal}`, { params });
        return data.data || [];
    },
    /** Obtener documentos pendientes de una entidad */
    obtenerDocumentosPendientes: async (sucursal, codEntidad, tipoEntidad) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/pendiente/${codEntidad}`, { params: { tipoEntidad } });
        return data.data || [];
    },
};
export { formatDateParam };
