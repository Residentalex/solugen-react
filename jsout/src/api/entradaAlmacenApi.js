import { apiClient } from './client';
const BASE = '/ENP';
export const entradaAlmacenApi = {
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
            params.entidad = filtro.entidad;
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
    crear: async (sucursal, entrada) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, entrada);
        return data.data;
    },
    actualizar: async (sucursal, entrada) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, entrada);
        return data.data;
    },
    aplicar: async (sucursal, id, confirmarSobrePrecio) => {
        const params = {};
        if (confirmarSobrePrecio)
            params.confirmarSobrePrecio = true;
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`, null, { params });
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    postear: async (sucursal, entrada, destino) => {
        const params = {};
        if (destino)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, entrada, { params });
        return data.data;
    },
    anular: async (sucursal, entrada, destino) => {
        const params = {};
        if (destino !== undefined)
            params.destino = destino;
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, entrada, { params });
        return data.data;
    },
    eliminar: async (sucursal, id) => {
        await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
    },
    revisado: async (sucursal, id) => {
        await apiClient.put(`${BASE}/${sucursal}/${id}/revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/reversar`);
    },
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
    obtenerUltimaEntrada: async (sucursal, codigo, sucursalId) => {
        const params = {};
        if (sucursalId !== undefined)
            params.sucursalId = sucursalId;
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ultima-entrada/${encodeURIComponent(codigo)}`, { params });
        return data.data ?? null;
    },
    obtenerMovimientosProducto: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/movimientos-producto/${encodeURIComponent(codigo)}`);
        return data.data ?? { ultimaCompra: null, ventas: [] };
    },
    obtenerUltimasEntradasPorSucursal: async (sucursal, codigo) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ultimas-entradas-producto/${encodeURIComponent(codigo)}`);
        return data.data ?? null;
    },
    obtenerVentasPosteriores: async (sucursal, codigo, fechaDesde, sucursalVentas) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/ventas-posteriores/${encodeURIComponent(codigo)}`, { params: { fechaDesde, sucursalVentas } });
        return data.data ?? 0;
    },
    obtenerResumenMovimientosPosteriores: async (sucursal, codigo, fechaDesde, sucursalMov) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/resumen-movimientos-posteriores/${encodeURIComponent(codigo)}`, { params: { fechaDesde, sucursalMov } });
        return data.data ?? null;
    },
    obtenerTotalPosteable: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`${BASE}/total-posteable/${sucursal}`, {
            params: { desde, hasta }
        });
        return data.data ?? 0;
    },
    obtenerDetalleMovimientosPosteriores: async (sucursal, codigo, fechaDesde, sucursalMov) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/detalle-movimientos-posteriores/${encodeURIComponent(codigo)}`, { params: { fechaDesde, sucursalMov } });
        return data.data ?? null;
    },
};
