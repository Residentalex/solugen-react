import { apiClient } from './client';
const BASE = '/PV';
export const facturaPOSApi = {
    buscarPorDocumento: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar-documento`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    buscarPorNCF: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar-ncf`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    buscarPorTurno: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar-turno`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    buscarPorCliente: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar-cliente`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    buscarPorCampos: async (sucursal, params) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/buscar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerResumen: async (sucursal, desde, hasta, cantidad, salto, estado) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        if (estado !== undefined)
            params.estado = estado;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/resumen`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerVista: async (sucursal, desde, hasta, cantidad, salto, estado) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        if (cantidad)
            params.cantidad = cantidad;
        if (salto)
            params.salto = salto;
        if (estado !== undefined)
            params.estado = estado;
        const { data } = await apiClient.get(`${BASE}/${sucursal}`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
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
            params.cliente = filtro.entidad;
        if (filtro.cliente)
            params.cliente = filtro.cliente;
        if (filtro.referencia)
            params.referencia = filtro.referencia;
        if (filtro.almacen)
            params.almacen = filtro.almacen;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/filtrar`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    obtenerPorId: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}`);
        return data.data;
    },
    // ===== Carga progresiva: secciones =====
    obtenerEncabezado: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/encabezado`);
        return data.data;
    },
    obtenerDetalles: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/detalles`);
        return data.data || [];
    },
    obtenerCobros: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/cobros`);
        return data.data || [];
    },
    obtenerAsientos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/asientos`);
        return data.data || [];
    },
    obtenerImpuestos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/impuestos`);
        return data.data || [];
    },
    obtenerRelacionados: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/relacionados`);
        return data.data || [];
    },
    obtenerTotal: async (sucursal, desde, hasta) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/total/${sucursal}`, { params });
        return data.data;
    },
    // ===== CRUD formulario =====
    crear: async (sucursal, factura) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, factura);
        return data.data;
    },
    actualizar: async (sucursal, factura) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, factura);
        return data.data;
    },
    anular: async (sucursal, factura) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, factura);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    postear: async (sucursal, factura) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, factura);
        return data.data;
    },
    generarPVC: async (sucursal, id, destino) => {
        const params = {};
        if (destino !== undefined)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generar-pvc/${id}`, null, { params });
        return data.data;
    },
    // ===== Catálogos =====
    obtenerConceptos: async (sucursal, tipoDocumento) => {
        const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
        const params = {};
        const { data } = await apiClient.get(url, { params });
        return data.data;
    },
    obtenerAlmacenes: async (sucursal) => {
        const { data } = await apiClient.get(`/Almacen/${sucursal}`);
        return data.data;
    },
    obtenerClientes: async (sucursal) => {
        const { data } = await apiClient.get(`/Cliente/${sucursal}/activos`);
        return data.data ?? [];
    },
    // ===== ESC/POS (impresión térmica raw) =====
    obtenerEscPos: async (sucursal, id) => {
        const { data } = await apiClient.get(`/reportes/facturacion/pos/${sucursal}/${id}/escpos`);
        return data.data;
    },
    generarEscPos: async (dto) => {
        const { data } = await apiClient.post(`/reportes/facturacion/pos/escpos`, dto);
        return data.data;
    },
    generarEscPosConSucursal: async (sucursal, dto) => {
        const { data } = await apiClient.post(`/reportes/facturacion/pos/${sucursal}/escpos`, dto);
        return data.data;
    },
};
