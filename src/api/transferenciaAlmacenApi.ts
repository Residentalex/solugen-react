import { apiClient } from './client';
import type { MovimientoVistaDTO, FiltroTRP, TransferenciaAlmacenFullDTO } from '../types/transferenciaAlmacen';
import type { ConceptoDTO, AlmacenDTO } from '../types/entradaAlmacen';
import type { ApiResponse } from '../types/auth';

const BASE = '/TRP';

export const transferenciaAlmacenApi = {
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
    filtro: FiltroTRP
  ): Promise<MovimientoVistaDTO[]> => {
    const params: Record<string, string | number> = {};
    if (filtro.cantidad) params.cantidad = filtro.cantidad;
    if (filtro.salto) params.salto = filtro.salto;
    if (filtro.desde) params.desde = filtro.desde;
    if (filtro.hasta) params.hasta = filtro.hasta;
    if (filtro.documento) params.documento = filtro.documento;
    if (filtro.concepto) params.concepto = filtro.concepto;
    if (filtro.almacen) params.almacen = filtro.almacen;

    const { data } = await apiClient.get<ApiResponse<MovimientoVistaDTO[]>>(`${BASE}/${sucursal}/filtrar`, { params });
    return data.data;
  },

  obtenerPorId: async (sucursal: number, id: number): Promise<TransferenciaAlmacenFullDTO> => {
    const { data } = await apiClient.get<ApiResponse<TransferenciaAlmacenFullDTO>>(`${BASE}/${sucursal}/${id}`);
    return data.data;
  },

  crear: async (sucursal: number, trp: TransferenciaAlmacenFullDTO): Promise<TransferenciaAlmacenFullDTO> => {
    const { data } = await apiClient.post<ApiResponse<TransferenciaAlmacenFullDTO>>(`${BASE}/${sucursal}`, trp);
    return data.data;
  },

  actualizar: async (sucursal: number, trp: TransferenciaAlmacenFullDTO): Promise<TransferenciaAlmacenFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransferenciaAlmacenFullDTO>>(`${BASE}/${sucursal}`, trp);
    return data.data;
  },

  aplicar: async (sucursal: number, id: number): Promise<TransferenciaAlmacenFullDTO> => {
    const { data } = await apiClient.put<ApiResponse<TransferenciaAlmacenFullDTO>>(`${BASE}/${sucursal}/aplicar/${id}`);
    return data.data;
  },

  postear: async (sucursal: number, trp: TransferenciaAlmacenFullDTO): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/postear`, trp);
    return data.data;
  },

  anular: async (sucursal: number, trp: any): Promise<any> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`${BASE}/${sucursal}/anular`, trp);
    return data.data;
  },

  desaplicar: async (sucursal: number, documento: string): Promise<any> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`${BASE}/desaplicar?sucursal=${sucursal}&documento=${documento}`);
    return data.data;
  },

  // Catálogos para selects
  obtenerConceptos: async (sucursal: number, tipoDocumento?: string): Promise<ConceptoDTO[]> => {
    const params: Record<string, string> = {};
    if (tipoDocumento) params.documento = tipoDocumento;
    const { data } = await apiClient.get<ApiResponse<ConceptoDTO[]>>(`/Concepto/${sucursal}`, { params });
    return data.data;
  },

  obtenerAlmacenes: async (sucursal: number): Promise<AlmacenDTO[]> => {
    const { data } = await apiClient.get<ApiResponse<AlmacenDTO[]>>(`/Almacen/${sucursal}`);
    return data.data;
  },
};