import { apiClient } from './client';
import type { ProductoListaDTO, ProductoDTO, ProductoVistaDTO, FiltroProducto, ResultadoImportacionDTO, ProductoImportadoDTO, ProductoSucursalDTO } from '../types/productos';
import { type ApiResponse, Sucursal } from '../types/auth';

const BASE = '/Producto';

export const productoApi = {
  obtenerVista: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; codigo?: string; nombre?: string; activo?: boolean }
  ): Promise<{ items: ProductoVistaDTO[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<ProductoVistaDTO[]>>(`${BASE}/${sucursal}/vista`, { params });
    return { items: data.data ?? [], total: data.total ?? 0 };
  },

  /** Obtener listado paginado */
  obtenerListado: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  /** Obtener total de productos (con filtros opcionales) */
  obtenerTotal: async (
    sucursal: number,
    params?: { codigo?: string; activo?: boolean }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/total/${sucursal}`, { params });
    return data.data;
  },

  /** Listado basico sin JOINs para modal de busqueda */
  obtenerListadoBasico: async (
    sucursal: number,
    params?: { cantidad?: number; salto?: number; codigo?: string; activo?: boolean }
  ): Promise<ProductoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoDTO[]>>(`${BASE}/${sucursal}/basico`, { params });
    return data.data;
  },

  /** Total del listado basico */
  obtenerTotalListadoBasico: async (
    sucursal: number,
    params?: { codigo?: string; activo?: boolean }
  ): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<number>>(`${BASE}/${sucursal}/basico/total`, { params });
    return data.data;
  },

  filtrar: async (sucursal: number, filtro: FiltroProducto): Promise<ProductoListaDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params: filtro });
    return data.data;
  },

  obtenerPorCodigo: async (sucursal: number, codigo: string): Promise<ProductoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}/${codigo}`);
    return data.data;
  },

  obtenerDetalle: async (
    sucursal: number,
    codigo: string,
    signal?: AbortSignal
  ): Promise<ProductoDTO> => {
    const { data } = await apiClient.get<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}/${codigo}`, { signal });
    return data.data;
  },

  /** Obtener códigos de productos con vencimiento */
  obtenerProductosVencimiento: async (
    sucursal: number,
    codigos: string[]
  ): Promise<string[]> => {
    const { data } = await apiClient.put<ApiResponse<{ codigo: string }[]>>(
      `${BASE}/productosVencimiento/${sucursal}`,
      codigos
    );
    return (data.data || []).map((p) => p.codigo);
  },

  descargarPlantilla: async (sucursal: number): Promise<Blob> => {
    const { data } = await apiClient.get(`${BASE}/${sucursal}/plantilla`, {
      responseType: 'blob',
    });
    return data;
  },

  descargarResultado: async (sucursal: number, productos: ProductoImportadoDTO[]): Promise<Blob> => {
    const { data } = await apiClient.post(`${BASE}/${sucursal}/descargarResultado`, productos, { responseType: 'blob' });
    return data;
  },

  importarExcel: async (sucursal: number, file: File): Promise<ResultadoImportacionDTO> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await apiClient.post<{ isSuccess: boolean; data: ResultadoImportacionDTO; errorMessage: string }>(
      `${BASE}/${sucursal}/importar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },

  obtenerComodines: async (sucursal: number): Promise<any[]> => {
    const { data } = await apiClient.get(`/Producto/comodines/${sucursal}`);
    if (Array.isArray(data)) return data;
    return data.data || [];
  },

  /** Obtener productos por código de suplidor */
  obtenerProductosPorSuplidor: async (
    sucursal: number,
    codigoSuplidor: string,
    signal?: AbortSignal
  ): Promise<ProductoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<ProductoDTO[]>>(
      `${BASE}/${sucursal}/suplidor/${codigoSuplidor}`,
      { signal }
    );
    return data.data;
  },

  /** Obtener productos por lista de códigos */
  obtenerPorListaCodigos: async (
    sucursal: number,
    codigos: string[],
    datosExtra?: boolean
  ): Promise<ProductoDTO[]> => {
    const { data } = await apiClient.put<ApiResponse<ProductoDTO[]>>(
      `${BASE}/codigos/${sucursal}`,
      codigos,
      { params: datosExtra !== undefined ? { datosExtra } : {} }
    );
    return data.data;
  },

  /** Buscar productos por campo específico (codigo, referencia, equival) */
  buscarPorCampo: async (
    sucursal: number,
    campo: 'codigo' | 'referencia' | 'equival',
    valor: string,
    cantidad: number = 10
  ): Promise<ProductoListaDTO[]> => {
    const params = { campo, valor, cantidad };
    const { data } = await apiClient.get<ApiResponse<ProductoListaDTO[]>>(
      `${BASE}/${sucursal}/buscar`,
      { params }
    );
    return data.data;
  },

  crear: async (sucursal: number, producto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await apiClient.post<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}`, producto);
    return data.data;
  },

  actualizar: async (sucursal: number, producto: ProductoDTO): Promise<ProductoDTO> => {
    const { data } = await apiClient.put<ApiResponse<ProductoDTO>>(`${BASE}/${sucursal}`, producto);
    return data.data;
  },

  /** Precio y oferta actual de un producto en la sucursal activa */
  precioSucursal: async (sucursal: number, codigo: string): Promise<ProductoSucursalDTO | null> => {
    const { data } = await apiClient.get<ApiResponse<ProductoSucursalDTO[]>>(`${BASE}/precioSucursal`, { params: { codigo } });
    const items = data.data ?? [];
    const nombreActiva = Object.keys(Sucursal).find((k) => (Sucursal as Record<string, number>)[k] === sucursal);
    return items.find((p) => p.sucursal === nombreActiva) ?? null;
  },

  /** Precios (regular + oferta) de múltiples productos en una sola llamada */
  preciosPorSucursal: async (sucursal: number, codigos: string[]): Promise<Map<string, ProductoSucursalDTO>> => {
    const { data } = await apiClient.get<ApiResponse<ProductoSucursalDTO[]>>(
      `${BASE}/precioSucursal/${sucursal}`,
      { params: { codigos: codigos.join(',') } }
    );
    const items = data.data ?? [];
    const mapa = new Map<string, ProductoSucursalDTO>();
    items.forEach((p) => mapa.set(p.codigo, p));
    return mapa;
  },
};
