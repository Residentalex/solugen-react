import { apiClient } from './client';
import type { MovimientoVistaDTO, FiltroDVC } from '../types/devolucionCompra';
import type { DevolucionCompraFullDTO, TipoDTO } from '../types/devolucionCompra';
import type { ConceptoDTO, AlmacenDTO, SuplidorDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/DVC';

export const devolucionCompraApi = {
  obtenerVista: async (
    sucursal: number,
    desde?: string,
    hasta?: string,
    cantidad?: number,
    salto?: number,
    estado?: number
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    if (cantidad) params.cantidad = cantidad;
    if (salto) params.salto = salto;
    if (estado !== undefined) params.estado = estado;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}`, { params });
    return data.data;
  },

  filtrar: async (
    sucursal: number,
    filtro: FiltroDVC
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.entidad) params.entidad = filtro.entidad;
    if (filtro.referencia) params.referencia = filtro.referencia;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<DevolucionCompraFullDTO> => {
    const { data } = await apiClient.get<ApiResponse<DevolucionCompraFullDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, devolucion: DevolucionCompraFullDTO): Promise<DevolucionCompraFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<DevolucionCompraFullDTO>>(`${BASE}/${sucursal}`, devolucion);
    return data.data;
  },

  actualizar: async (sucursal: number, devolucion: DevolucionCompraFullDTO): Promise<DevolucionCompraFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<DevolucionCompraFullDTO>>(`${BASE}/${sucursal}`, devolucion);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<DevolucionCompraFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<DevolucionCompraFullDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  desaplicar: async (sucursal: number, documento: string): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/desaplicar?sucursal=${sucursal}&documento=${documento}`);
    return data.data;
  },

  postear: async (sucursal: number, devolucion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, devolucion);
    return data.data;
  },

  revisar: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/${sucursal}/revisar/${id}`);
    return data.data;
  },

  reversar: async (sucursal: number, devolucion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/reversar`, devolucion);
    return data.data;
  },

  anular: async (sucursal: number, devolucion: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, devolucion);
    return data.data;
  },

  eliminar: async (sucursal: number, id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${sucursal}/eliminar/${id}`);
  },

  verificarScan: async (sucursal: number, id: number): Promise<{ existe: boolean }> => {
    const { data } = await apiClient.get<ApiResponse<{ existe: boolean }>>(`${BASE}/${sucursal}/${id}/scanner/verificar`);
    return data.data;
  },

  descargarScan: async (sucursal: number, id: number): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`${BASE}/${sucursal}/${id}/scanner/descargar`, {
      responseType: 'blob',
    });
    return data;
  },

  // ===== Catálogos para formulario =====

  obtenerTipos: async (sucursal: number): Promise<TipoDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<TipoDTO[]>>(`/Tipo/${sucursal}/documento/DVC`);
    return data.data;
  },

  obtenerConceptos: async (sucursal: number, tipoId?: number): Promise<ConceptoDTO[]> => {
    const params: Record<string, any> = {};
    if (tipoId) params.tipoId = tipoId;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}/documento/DVC`, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },

  obtenerSuplidores: async (sucursal: number): Promise<SuplidorDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<SuplidorDTO[]>>(`/Proveedor/${sucursal}`);
    return data.data;
  },

  obtenerTipoDVCDefecto: async (sucursal: number): Promise<TipoDTO> => {
    const { data } = await apiClient.get<ApiResponse<TipoDTO>>(`/Tipo/${sucursal}/DVCDefecto`);
    return data.data;
  },

  buscarEntradas: async (sucursal: number, params?: any): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/ENP/${sucursal}/vista`, { params });
    return data.data;
  },

  obtenerDetalleEntrada: async (sucursal: number, id: number): Promise<any> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/ENP/${sucursal}/${id}`);
    return data.data;
  },

  obtenerPorIdEntrada: async (sucursal: number, idEntrada: number): Promise<any[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`${BASE}/${sucursal}/idEntrada/${idEntrada}`);
    return data.data;
  },
};
