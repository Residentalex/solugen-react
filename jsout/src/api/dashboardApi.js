import { apiClient } from './client';
// ============================================================
// API Client
// ============================================================
const BASE = '/Dashboard';
export const dashboardApi = {
    obtenerResumen: async (sucursal, desde, hasta) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/resumen`, {
            params: { ...params, sucursal },
        });
        return data.data;
    },
    obtenerRecientes: async (sucursal, cantidad = 10) => {
        const { data } = await apiClient.get(`${BASE}/recientes`, {
            params: { sucursal, cantidad },
        });
        return data.data;
    },
    obtenerVentasPorMes: async (sucursal, meses = 6) => {
        const { data } = await apiClient.get(`${BASE}/ventas-por-mes`, {
            params: { sucursal, meses },
        });
        return data.data;
    },
    obtenerDocsPorTipo: async (sucursal, desde, hasta) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/docs-por-tipo`, {
            params: { ...params, sucursal },
        });
        return data.data;
    },
    obtenerComparativoSucursales: async (desde, hasta) => {
        const params = {};
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/comparativo-sucursales`, {
            params,
        });
        return data.data ?? [];
    },
    obtenerSucursalesActivas: async () => {
        const { data } = await apiClient.get(`${BASE}/sucursales-activas`);
        return data.data ?? [];
    },
    obtenerEvolucionDiaria: async (sucursal, desde, hasta) => {
        const params = { sucursal: String(sucursal) };
        if (desde)
            params.desde = desde;
        if (hasta)
            params.hasta = hasta;
        const { data } = await apiClient.get(`${BASE}/evolucion-diaria`, { params });
        return data.data ?? [];
    },
    obtenerDocsNoCuadrados: async (sucursal, desde, hasta) => {
        const { data } = await apiClient.get(`/Transaccion/${sucursal}/asientosnoCuadrado`, {
            params: { desde, hasta },
        });
        return data.data ?? [];
    },
    obtenerPendientesNCF: async (desde, hasta) => {
        const { data } = await apiClient.get(`/DGII/pendientes-dashboard`, {
            params: { desde, hasta, skip: 0, take: 10 },
        });
        return data.data ?? [];
    },
    obtenerProductosStockNegativo: async (sucursal, cantidad = 25, salto = 0) => {
        const { data } = await apiClient.get(`${BASE}/productos-stock-negativo/${sucursal}`, { params: { cantidad, salto } });
        return data.data ?? { items: [], total: 0 };
    },
};
