import { apiClient } from './client';
const BASE = '/Transaccion';
const TIPO_DOC = 'NC';
export const notaCreditoApi = {
    obtenerVista: async (sucursal, tipoEntidad, desde, hasta, cantidad, salto, estado, documentCode = TIPO_DOC) => {
        const params = { TipoEntidad: tipoEntidad };
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
        const { data } = await apiClient.get(`${BASE}/${sucursal}/tipo/${documentCode}`, { params });
        return { data: data.data || [], total: data.total ?? 0 };
    },
    filtrar: async (sucursal, tipoEntidad, filtro, documentCode = TIPO_DOC) => {
        const params = { tipoEntidad };
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
        const { data } = await apiClient.get(`${BASE}/${sucursal}/tipo/${documentCode}/filtrar`, { params });
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
        const { data } = await apiClient.get(`${BASE}/${sucursal}/detalles/${id}`);
        return data.data;
    },
    obtenerAsientos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/asientos`);
        return data.data;
    },
    obtenerImpuestos: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/impuestos`);
        return data.data;
    },
    obtenerRelacionados: async (sucursal, id) => {
        const { data } = await apiClient.get(`${BASE}/${sucursal}/${id}/relacionados`);
        return data.data;
    },
    crear: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}`, transaccion);
        return data.data;
    },
    actualizar: async (sucursal, transaccion) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}`, transaccion);
        return data.data;
    },
    anular: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/anular`, transaccion);
        return data.data;
    },
    aplicar: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/aplicar/${id}`);
        return data.data;
    },
    desaplicar: async (origen, documento) => {
        const params = { origen, documento };
        await apiClient.put(`${BASE}/desaplicar`, null, { params });
    },
    postear: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/postear`, transaccion);
        return data.data;
    },
    recalcularPagos: async (sucursal, id) => {
        const { data } = await apiClient.put(`${BASE}/${sucursal}/recalcularPagos/${id}`);
        return data.data;
    },
    generarAsientos: async (sucursal, transaccion) => {
        const { data } = await apiClient.post(`${BASE}/${sucursal}/generarAsiento`, transaccion);
        return data.data;
    },
    recalcular: async (sucursal, id) => {
        const { data } = await apiClient.put(`/Transaccion/${sucursal}/recalcularPagos/${id}`);
        return data;
    },
    ajustarAsociadaInventario: async (sucursal, transaccionID, asociadaID, monto, perdida) => {
        const { data } = await apiClient.put(`/Transaccion/${sucursal}/ajustarAsociadaINV/${transaccionID}/${asociadaID}/${monto}/${perdida}`);
        return data;
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
    revisado: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Revisado`);
    },
    reversar: async (sucursal, id) => {
        await apiClient.post(`${BASE}/${sucursal}/${id}/Reversar`);
    },
    verificarNCF: async (sucursal, ncf, idEntidad) => {
        try {
            const { data } = await apiClient.get(`/Transaccion/${sucursal}/ncf`, {
                params: { ncf, idEntidad }
            });
            return data?.data != null;
        }
        catch {
            return true;
        }
    },
};
