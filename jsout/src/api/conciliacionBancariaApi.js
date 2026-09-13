import { apiClient } from './client';
const BASE = '/ConciliacionBancaria';
export const conciliacionBancariaApi = {
    /** Obtener listado paginado con filtros */
    obtenerVista: async (sucursal, params) => {
        const queryParams = {};
        if (params.cantidad !== undefined)
            queryParams.cantidad = params.cantidad;
        if (params.salto !== undefined)
            queryParams.salto = params.salto;
        if (params.desde)
            queryParams.desde = params.desde;
        if (params.hasta)
            queryParams.hasta = params.hasta;
        if (params.numeroCta)
            queryParams.numeroCta = params.numeroCta;
        if (params.aplicada)
            queryParams.aplicada = params.aplicada;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params: queryParams });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    /** Para useDocumentoListado.fetchVista */
    obtenerVistaDocumento: async (sucursal, desde, hasta, filas, salto, estado) => {
        const params = {
            cantidad: filas,
            salto,
            desde,
            hasta,
        };
        if (estado === 0)
            params.aplicada = 'F';
        else if (estado === 1)
            params.aplicada = 'T';
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    /** Para useDocumentoListado.fetchFiltrar */
    filtrarDocumento: async (sucursal, params) => {
        const queryParams = {
            cantidad: params.cantidad || 25,
            salto: params.salto || 0,
        };
        if (params.desde)
            queryParams.desde = params.desde;
        if (params.hasta)
            queryParams.hasta = params.hasta;
        if (params.documento) {
            queryParams.numeroCta = params.documento;
            const id = parseInt(params.documento, 10);
            if (!isNaN(id) && id > 0)
                queryParams.concilID = id;
        }
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params: queryParams });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    /** Obtener conciliación completa por ID */
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        if (!data.data)
            throw new Error('Conciliación no encontrada');
        return data.data;
    },
    /** Obtener solo el encabezado de la conciliación (rápido: sin movimientos ni transacciones) */
    obtenerEncabezado: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/encabezado`);
        if (!data.data)
            throw new Error('Conciliación no encontrada');
        return data.data;
    },
    /** Obtener movimientos de DARCHCON de la conciliación */
    obtenerMovimientos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/movimientos`);
        return data.data || [];
    },
    /** Crear nueva conciliación */
    crear: async (sucursal, dto) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, dto);
        if (!data.data)
            throw new Error('Error al crear conciliación');
        return data.data;
    },
    /** Actualizar conciliación existente */
    actualizar: async (sucursal, id, dto) => {
        await apiClient.put(`${BASE}/${sucursal}/${id}`, dto);
    },
    /** Eliminar conciliación */
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/${id}`);
    },
    /** Aplicar conciliación (cambia estado a aplicada) */
    aplicar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/aplicar`);
    },
    /** Importar movimientos bancarios desde archivo (multipart/form-data) */
    importarMovimientos: async (sucursal, concilId, file) => {
        const formData = new FormData();
        formData.append('archivo', file);
        const { data } = await apiClient.post(`${BASE}/${sucursal}/importar/${concilId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.data || [];
    },
    /** Preview: sube archivo, devuelve movimientos con Documento resuelto */
    importarPreview: async (sucursal, file, concilId) => {
        const formData = new FormData();
        formData.append('archivo', file);
        const url = concilId
            ? `${BASE}/${sucursal}/importar/preview?concilId=${concilId}`
            : `${BASE}/${sucursal}/importar/preview`;
        const { data } = await apiClient.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data.data || [];
    },
    /** Guardar: envía movimientos (JSON) para insertar en DARCHCON */
    guardarMovimientosImportados: async (sucursal, concilId, movimientos) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/importar/guardar/${concilId}`, movimientos);
        return data.data || 0;
    },
    /** Obtener cuentas bancarias disponibles (CTASBANC) */
    obtenerCuentasBancarias: async (sucursal) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/cuentas`);
        return data.data || [];
    },
    /** Obtener saldo según libros (DTRANS_CONT) hasta la fecha indicada para una cuenta bancaria */
    obtenerSaldoLibros: async (sucursal, ctaBanc, fecha) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/saldo-libros`, { params: { ctaBanc, fecha } });
        return data.data ?? 0;
    },
    /** Obtener transacciones del sistema relacionadas con el CONCILID */
    obtenerTransaccionesConciliadas: async (sucursal, concilId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${concilId}/transacciones`);
        return data.data || [];
    },
    /** Obtener documentos en tránsito desde DOCTRANS */
    obtenerEnTransito: async (sucursal, concilId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${concilId}/en-transito`);
        return data.data || [];
    },
    /** Obtener transacciones sin conciliar de la cuenta (CONCIL='F'/NULL o CONCIL='T' del concilID en edición) */
    obtenerTransaccionesSinConciliar: async (sucursal, numeroCta, concilID = 0, fecha) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/transacciones-sin-conciliar`, { params: { numeroCta, concilID, ...(fecha ? { fecha } : {}) } });
        return data.data || [];
    },
    /** Obtener resumen general de conciliación */
    obtenerResumenGeneral: async (sucursal, concilId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${concilId}/resumen-general`);
        return data.data;
    },
    /** Exportar movimientos del libro del mayor */
    exportarLibros: async (sucursal, concilId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${concilId}/exportar-libros`);
        return data.data || [];
    },
    /** Exportar documentos en tránsito */
    exportarTransito: async (sucursal, concilId) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${concilId}/exportar-transito`);
        return data.data || [];
    },
};
