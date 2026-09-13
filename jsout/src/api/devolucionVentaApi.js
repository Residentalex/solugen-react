import { apiClient } from './client';
const BASE = '/DEV';
export const devolucionVentaApi = {
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
    // ═══ Carga progresiva: encabezado ligero + secciones on-demand ═══
    obtenerEncabezado: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/encabezado`);
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
    crear: async (sucursal, devolucion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, devolucion);
        return data.data;
    },
    crearDesdePV: async (sucursal, pvId, body) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/desde-pv/${pvId}`, body || {});
        return data.data;
    },
    actualizar: async (sucursal, devolucion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, devolucion);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (sucursal, documento) => {
        const { data } = await apiClient.put(`${BASE}/desaplicar`, null, {
            params: { origen: sucursal, documento }
        });
        return data.data;
    },
    postear: async (sucursal, devolucion, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, devolucion, { params });
        return data.data;
    },
    postearMovimiento: async (sucursal, movimiento, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postearMovimiento`, movimiento, { params });
        return data.data;
    },
    anular: async (sucursal, devolucion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, devolucion);
        return data.data;
    },
    // ===== Catálogos para selects =====
    obtenerConceptos: async (sucursal, tipoDocumento) => {
        const url = tipoDocumento ? `/Concepto/${sucursal}/documento/${tipoDocumento}` : `/Concepto/${sucursal}`;
        const params = {};
        const { data } = await apiClient.get(url, { params });
        return data.data;
    },
    obtenerClientes: async (sucursal) => {
        const { data } = await apiClient.get(`/Cliente/${sucursal}/activos`);
        return data.data;
    },
    obtenerAlmacenes: async (sucursal) => {
        const { data } = await apiClient.get(`/Almacen/${sucursal}`);
        return data.data;
    },
    obtenerFacturaPOS: async (sucursal, id) => {
        const { data } = await apiClient.get(`/PV/${sucursal}/${id}`);
        return data.data;
    },
    // ===== Acciones de estado =====
    revisado: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
    },
    generarND: async (sucursal, devolucionIds, fechaDocumento) => {
        const body = { devolucionIds };
        if (fechaDocumento)
            body.fechaDocumento = fechaDocumento;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generar-nd`, body);
        return data.data;
    },
    // ===== Scanner =====
    verificarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/verificar`);
        return data.data;
    },
    descargarScan: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
            responseType: 'blob',
        });
        return data;
    },
};
