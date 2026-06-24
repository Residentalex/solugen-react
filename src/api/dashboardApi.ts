import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

// ============================================================
// DTOs
// ============================================================

export interface DashboardResumenDTO {
  ventasDelMes: number;
  cantidadVentas: number;
  comprasDelMes: number;
  cantidadCompras: number;
  documentosPendientes: number;
  ordenesCompraActivas: number;
  clientesActivos: number;
  productosInventario: number;
  entradasAlmacenMes: number;
  salidasAlmacenMes: number;
  variacionVentas?: number;
  ventasPeriodoAnterior?: number;
  variacionCompras?: number;
  comprasPeriodoAnterior?: number;
}

export interface DocumentoRecienteDTO {
  tipoDocumento: string;
  noDocumento: string;
  entidadNombre: string;
  total: number;
  estado: number;
  estadoNombre: string;
  fecha: string;
}

export interface VentaPorMesDTO {
  anio: number;
  mes: number;
  etiqueta: string;
  totalVentas: number;
  totalCompras: number;
  cantidadVentas: number;
}

export interface DocumentosPorTipoDTO {
  tipoDocumento: string;
  nombreDocumento: string;
  cantidad: number;
  total: number;
}

export interface SucursalComparativoDTO {
  sucursal: string;
  ventas: number;
  cantVentas: number;
  compras: number;
  cantCompras: number;
  pendientes: number;
}

export interface SucursalActivaDTO {
  codigo: string;
  nombre: string;
}

export interface ProductoStockNegativoDTO {
  codigo: string;
  nombre: string;
  existencia: number;
  ultimoCosto: number | null;
  almacen: string;
}

export interface EvolucionDiariaDTO {
  fecha: string;
  ventas: number;
  cantidad: number;
}

export interface StockNegativoResponseDTO {
  items: ProductoStockNegativoDTO[];
  total: number;
}

export interface EnvioDGIIDTO {
  id?: number;
  ncf?: string;
  tipoDocumento?: number;
  tipoComprobante?: string;
  sucursal: number;
  sucursalNombre?: string;
  transaccionID: number;
  fechaEnvio?: string;
  estado?: string;
  mensaje?: string;
  archivo?: string;
  codigoQR?: string;
  fecha?: string;
  documento?: string;
  cliente?: string;
  respuestaDGII?: string;
}

// ============================================================
// API Client
// ============================================================

const BASE = '/Dashboard';

export const dashboardApi = {
  obtenerResumen: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
  ): Promise<DashboardResumenDTO> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;

    const { data } = await apiClient.get<ApiResponse<DashboardResumenDTO>>(`${BASE}/resumen`, {
      params: { ...params, sucursal },
    });
    return data.data;
  },

  obtenerRecientes: async (
    sucursal: number,
    cantidad: number = 10,
  ): Promise<DocumentoRecienteDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<DocumentoRecienteDTO[]>>(`${BASE}/recientes`, {
      params: { sucursal, cantidad },
    });
    return data.data;
  },

  obtenerVentasPorMes: async (
    sucursal: number,
    meses: number = 6,
  ): Promise<VentaPorMesDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<VentaPorMesDTO[]>>(`${BASE}/ventas-por-mes`, {
      params: { sucursal, meses },
    });
    return data.data;
  },

  obtenerDocsPorTipo: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
  ): Promise<DocumentosPorTipoDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;

    const { data } = await apiClient.get<ApiResponse<DocumentosPorTipoDTO[]>>(`${BASE}/docs-por-tipo`, {
      params: { ...params, sucursal },
    });
    return data.data;
  },

  obtenerComparativoSucursales: async (
    desde?: string,
    hasta?: string,
  ): Promise<SucursalComparativoDTO[]> => {
    const params: Record<string, string> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;

    const { data } = await apiClient.get<ApiResponse<SucursalComparativoDTO[]>>(`${BASE}/comparativo-sucursales`, {
      params,
    });
    return data.data ?? [];
  },

  obtenerSucursalesActivas: async (): Promise<SucursalActivaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SucursalActivaDTO[]>>(`${BASE}/sucursales-activas`);
    return data.data ?? [];
  },

  obtenerEvolucionDiaria: async (
    sucursal: number,
    desde?: string,
    hasta?: string
  ): Promise<EvolucionDiariaDTO[]> => {
    const params: Record<string, string> = { sucursal: String(sucursal) };
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    const { data } = await apiClient.get<ApiResponse<EvolucionDiariaDTO[]>>(
      `${BASE}/evolucion-diaria`,
      { params }
    );
    return data.data ?? [];
  },

  obtenerDocsNoCuadrados: async (
    sucursal: number,
    desde: string,
    hasta: string,
  ): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/Transaccion/${sucursal}/asientosnoCuadrado`, {
      params: { desde, hasta },
    });
    return data.data ?? [];
  },

  obtenerPendientesNCF: async (
    desde: string,
    hasta: string,
  ): Promise<EnvioDGIIDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<EnvioDGIIDTO[]>>(`/DGII/pendientes-dashboard`, {
      params: { desde, hasta, skip: 0, take: 10 },
    });
    return data.data ?? [];
  },

  obtenerProductosStockNegativo: async (
    sucursal: number,
    cantidad: number = 25,
    salto: number = 0
  ): Promise<StockNegativoResponseDTO> => {
    const { data } = await apiClient.get<ApiResponse<StockNegativoResponseDTO>>(
      `${BASE}/productos-stock-negativo/${sucursal}`,
      { params: { cantidad, salto } }
    );
    return data.data ?? { items: [], total: 0 };
  },
};
