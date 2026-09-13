import { apiClient } from './client';
const BASE = '/FAC';
export const facturaClienteApi = {
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
    obtenerReverso: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/reverso`);
        return data.data;
    },
    obtenerDetalles: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/detalles`);
        return data.data || [];
    },
    obtenerAsientos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/asientos`);
        return data.data || [];
    },
    obtenerPagos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/pagos`);
        return data.data || [];
    },
    obtenerCobros: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/cobros`);
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
    postear: async (sucursal, factura, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, factura, { params });
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    revisado: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
    },
    verificarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/${id}/scanner/verificar`);
        return data.data;
    },
    descargarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/${id}/scanner/descargar`, {
            responseType: 'blob',
        });
        return data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/Eliminar/${id}`);
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
    obtenerTipos: async (sucursal) => {
        const { data } = await apiClient.get(`/Tipo/${sucursal}/documento/FAC`);
        return data.data;
    },
};
